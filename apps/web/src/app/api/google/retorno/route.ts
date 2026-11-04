import { trocarCodigo } from "@cc/integrations/src/google.js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ESTADO, enderecoDeRetorno } from "@/lib/google";
import { exigirSessaoCompleta } from "@/lib/sessao";

/** Recebe a autorização do Google, guarda o token no cofre e registra a autorização de escrita. */
export async function GET(request: NextRequest) {
  const { supabase } = await exigirSessaoCompleta();
  const volta = (resultado: string) => NextResponse.redirect(new URL(`/integracoes?google=${resultado}`, request.url));

  const cofre = await cookies();
  const esperado = cofre.get(COOKIE_ESTADO)?.value;
  cofre.delete({ name: COOKIE_ESTADO, path: "/api/google" });

  const parametros = request.nextUrl.searchParams;
  const codigo = parametros.get("code");
  if (!esperado || parametros.get("state") !== esperado) return volta("erro");
  if (!codigo) return volta("cancelado");

  const { GOOGLE_CLIENT_ID: clienteId, GOOGLE_CLIENT_SECRET: segredo } = process.env;
  if (!clienteId || !segredo) return volta("sem-configuracao");

  try {
    const token = await trocarCodigo({ clienteId, segredo, retorno: enderecoDeRetorno(request.url), codigo });
    const { error: e1 } = await supabase.rpc("salvar_credencial", { p_ferramenta: "google", p_valor: token });
    if (e1) throw e1;
    const { error: e2 } = await supabase
      .from("conectores")
      .update({ modo: "leitura_escrita", escrita_autorizada_em: new Date().toISOString(), credencial_ref: "cc_google" })
      .eq("ferramenta", "google_agenda");
    if (e2) throw e2;
  } catch {
    return volta("erro");
  }
  return volta("conectado");
}
