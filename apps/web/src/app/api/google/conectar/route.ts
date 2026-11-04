import { urlAutorizacao } from "@cc/integrations/src/google.js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ESTADO, enderecoDeRetorno } from "@/lib/google";
import { exigirSessaoCompleta } from "@/lib/sessao";

/** Inicia a autorização do Google. O estado aleatório impede que outro site conclua a conexão. */
export async function GET(request: NextRequest) {
  await exigirSessaoCompleta();
  const clienteId = process.env.GOOGLE_CLIENT_ID;
  if (!clienteId) return NextResponse.redirect(new URL("/integracoes?google=sem-configuracao", request.url));

  const estado = crypto.randomUUID();
  (await cookies()).set(COOKIE_ESTADO, estado, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/google", maxAge: 600 });
  return NextResponse.redirect(urlAutorizacao({ clienteId, retorno: enderecoDeRetorno(request.url), estado }));
}
