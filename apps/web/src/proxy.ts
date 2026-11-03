import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { decidirRedirecionamento, type NivelAal } from "@/lib/rotas";

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
    return redirecionar;
  }
  return resposta;
}

export const config = {
  // Fora do proxy: arquivos estáticos, ícones, manifest e service worker (precisam carregar antes do login).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|icones/|manifest.webmanifest|sw.js).*)",
  ],
};
