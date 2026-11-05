import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_RETORNO, decidirRedirecionamento, retornoDoConsentimento, ROTA_CONSENTIMENTO, ROTA_INICIAL, type NivelAal } from "@/lib/rotas";

/** Renova a sessão do Supabase a cada requisição e bloqueia rotas sem senha + segundo fator. */
export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(lista) {
          lista.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let aalAtual: NivelAal = null;
  let aalProximo: NivelAal = null;
  if (user) {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    aalAtual = (data?.currentLevel as NivelAal) ?? null;
    aalProximo = (data?.nextLevel as NivelAal) ?? null;
  }

  const destino = decidirRedirecionamento(request.nextUrl.pathname, { logado: !!user, aalAtual, aalProximo });
  if (destino) {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    url.search = "";
    const redirecionar = NextResponse.redirect(url);
    resposta.cookies.getAll().forEach((c) => redirecionar.cookies.set(c));
    if (request.nextUrl.pathname === ROTA_CONSENTIMENTO) {
      redirecionar.cookies.set(COOKIE_RETORNO, `${ROTA_CONSENTIMENTO}${request.nextUrl.search}`, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
    }
    return redirecionar;
  }

  // Login concluído: volta ao pedido do Claude que estava aguardando
  const retorno = retornoDoConsentimento(request.cookies.get(COOKIE_RETORNO)?.value);
  if (retorno && request.nextUrl.pathname === ROTA_INICIAL) {
    const redirecionar = NextResponse.redirect(new URL(retorno, request.url));
    resposta.cookies.getAll().forEach((c) => redirecionar.cookies.set(c));
    redirecionar.cookies.delete(COOKIE_RETORNO);
    return redirecionar;
  }
  return resposta;
}

export const config = {
  // Fora do proxy: arquivos estáticos e o conector do Claude, que se autentica por token próprio.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|icones/|manifest.webmanifest|sw.js|api/mcp|\\.well-known/).*)",
  ],
};
