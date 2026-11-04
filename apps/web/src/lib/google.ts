import "server-only";
import { tokenDeAcesso } from "@cc/integrations/src/google.js";
import type { criarClienteServidor } from "@/lib/supabase/servidor";

export const COOKIE_ESTADO = "cc_google_estado";

export const enderecoDeRetorno = (urlAtual: string) => new URL("/api/google/retorno", urlAtual).toString();

/** Gera um acesso de curta duração. O token guardado no cofre só passa pelo servidor. */
export async function acessoGoogle(supabase: Awaited<ReturnType<typeof criarClienteServidor>>): Promise<string> {
  const { GOOGLE_CLIENT_ID: clienteId, GOOGLE_CLIENT_SECRET: segredo } = process.env;
  if (!clienteId || !segredo) throw new Error("Google ainda não configurado no servidor");
  const { data: tokenLongo, error } = await supabase.rpc("ler_credencial", { p_ferramenta: "google" });
  if (error || !tokenLongo) throw new Error("Google não conectado: use Integrações → Conectar Google");
  return tokenDeAcesso({ clienteId, segredo, tokenLongo });
}
