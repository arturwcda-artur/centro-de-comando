import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Aviso, Botao } from "@/components/ui";
import { retornoPermitido } from "@/lib/mcp";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { decidirAutorizacao } from "./acoes";

export const metadata: Metadata = { title: "Autorizar acesso" };

export default async function PaginaConsentimento({ searchParams }: { searchParams: Promise<{ authorization_id?: string }> }) {
  const { supabase } = await exigirSessaoCompleta();
  const { authorization_id: id } = await searchParams;
  if (!id) return <Aviso>Pedido de autorização inválido.</Aviso>;

  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
  if (error || !data) return <Aviso>Pedido de autorização inválido ou expirado. Volte ao Claude e conecte de novo.</Aviso>;

  // Já autorizado antes: o Supabase devolve só o endereço de retorno
  if (!("authorization_id" in data)) {
    if (!retornoPermitido(data.redirect_url)) return <Aviso>Este pedido não veio do Claude e foi recusado.</Aviso>;
    redirect(data.redirect_url);
  }
  if (!retornoPermitido(data.redirect_uri)) return <Aviso>Este pedido não veio do Claude e foi recusado.</Aviso>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Autorizar o Claude</h1>
        <p className="mt-1 text-sm text-suave">
          <strong>{data.client.name}</strong> pede para consultar o Centro de Comando.
        </p>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>Lê obras, tarefas, contratos, vencimentos, riscos e decisões.</li>
        <li>Não grava nada e não vê conteúdo com credencial.</li>
        <li>Os dados consultados passam pela sua conta do Claude.</li>
        <li>Você pode revogar em Integrações.</li>
      </ul>
      <form className="flex gap-2">
        <Botao formAction={decidirAutorizacao.bind(null, id, true)}>Autorizar</Botao>
        <button formAction={decidirAutorizacao.bind(null, id, false)} className="h-10 rounded-lg border border-borda px-4 text-sm font-medium hover:bg-superficie-2">
          Recusar
        </button>
      </form>
    </div>
  );
}
