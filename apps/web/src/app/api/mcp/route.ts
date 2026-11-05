import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { responderMcp } from "@/lib/mcp";

const TAMANHO_MAXIMO = 100_000;

function naoAutorizado(request: NextRequest) {
  const metadados = `${request.nextUrl.origin}/.well-known/oauth-protected-resource/api/mcp`;
  return new NextResponse(null, { status: 401, headers: { "WWW-Authenticate": `Bearer resource_metadata="${metadados}"` } });
}

const lerToken = (request: NextRequest) => /^Bearer (.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1] ?? null;

/** Conector do Claude. O token nunca chega às tabelas: só às funções assistente_* (ADR 0021). */
export async function POST(request: NextRequest) {
  const token = lerToken(request);
  if (!token) return naoAutorizado(request);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: recusado } = await supabase.rpc("assistente_verificar");
  if (recusado) return naoAutorizado(request);

  const corpo = await request.text();
  if (corpo.length > TAMANHO_MAXIMO) return new NextResponse(null, { status: 413 });
  let mensagem: unknown;
  try {
    mensagem = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON inválido" } }, { status: 400 });
  }

  const resposta = await responderMcp(mensagem, async (funcao, parametros) => {
    const { data, error } = await supabase.rpc(funcao, parametros);
    if (error) throw new Error(error.message);
    return data;
  });
  return resposta ? NextResponse.json(resposta) : new NextResponse(null, { status: 202 });
}

/** Sem canal de eventos: tudo é resposta direta ao POST. */
export function GET(request: NextRequest) {
  return lerToken(request) ? new NextResponse(null, { status: 405, headers: { Allow: "POST" } }) : naoAutorizado(request);
}
