import type { Metadata } from "next";
import Link from "next/link";
import { FolderInput, Plus } from "lucide-react";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { SITUACOES_OBRA, rotuloSituacao } from "@/lib/dominio";
import { brl, dataCivil, pct } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Obras" };

export default async function PaginaObras({ searchParams }: PageProps<"/obras">) {
  const { supabase } = await exigirSessaoCompleta();
  const filtro = (await searchParams).situacao;
  const situacao = SITUACOES_OBRA.some((s) => s.valor === filtro) ? (filtro as string) : null;

  let consulta = supabase.from("v_obra_resumo").select("*").order("codigo");
  if (situacao) consulta = consulta.eq("situacao", situacao);
  const [obras, empresas, contratantes, pendentes] = await Promise.all([
    consulta,
    supabase.from("empresas").select("id, razao_social, nome_fantasia"),
    supabase.from("contratantes").select("id, nome"),
    supabase.from("importacao_obras").select("id", { count: "exact", head: true }).eq("status", "pendente"),
  ]);
  const nomeEmpresa = new Map((empresas.data ?? []).map((e) => [e.id, e.nome_fantasia || e.razao_social]));
  const nomeContratante = new Map((contratantes.data ?? []).map((c) => [c.id, c.nome]));
  const lista = obras.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Obras</h1>
          <p className="text-sm text-suave">{lista.length} {lista.length === 1 ? "obra" : "obras"}{situacao ? ` · ${rotuloSituacao(situacao).rotulo}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/obras/importar" className="inline-flex h-10 items-center gap-2 rounded-lg border border-borda bg-superficie px-3 text-sm font-medium hover:bg-superficie-2">
            <FolderInput className="size-4" aria-hidden="true" /> Importação assistida
            {!!pendentes.count && <Etiqueta tom="atencao">{pendentes.count}</Etiqueta>}
          </Link>
          <Link href="/obras/nova" className="inline-flex h-10 items-center gap-2 rounded-lg bg-marca px-3 text-sm font-medium text-white hover:opacity-90">
            <Plus className="size-4" aria-hidden="true" /> Nova obra
          </Link>
        </div>
      </div>

      <nav aria-label="Filtrar por situação" className="flex flex-wrap gap-1.5">
        <Link href="/obras" className={`rounded-full px-3 py-1 text-xs font-medium ${!situacao ? "bg-marca text-white" : "border border-borda text-suave hover:text-texto"}`}>
          Todas
        </Link>
        {SITUACOES_OBRA.map((s) => (
          <Link
            key={s.valor}
            href={`/obras?situacao=${s.valor}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${situacao === s.valor ? "bg-marca text-white" : "border border-borda text-suave hover:text-texto"}`}
          >
            {s.rotulo}
          </Link>
        ))}
      </nav>

      {lista.length === 0 ? (
        <EstadoVazio>
          Nenhuma obra {situacao ? "nessa situação" : "cadastrada"}.{" "}
          {!!pendentes.count && (
            <Link href="/obras/importar" className="font-medium text-marca hover:underline">
              Revise as {pendentes.count} propostas lidas das suas pastas.
            </Link>
          )}
        </EstadoVazio>
      ) : (
        <Cartao className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-borda text-left text-xs text-suave">
              <tr>
                <th className="px-4 py-2.5 font-medium">Código</th>
                <th className="px-4 py-2.5 font-medium">Obra</th>
                <th className="px-4 py-2.5 font-medium">Situação</th>
                <th className="px-4 py-2.5 font-medium">Empresa · Contratante</th>
                <th className="px-4 py-2.5 text-right font-medium">Contratado</th>
                <th className="px-4 py-2.5 text-right font-medium">Físico</th>
                <th className="px-4 py-2.5 text-right font-medium">Prazo vigente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {lista.map((o) => {
                const s = rotuloSituacao(o.situacao);
                return (
                  <tr key={o.obra_id} className="hover:bg-superficie-2">
                    <td className="px-4 py-2.5 font-medium">
                      <Link href={`/obras/${o.obra_id}`} className="hover:text-marca hover:underline">
                        {o.codigo}
                      </Link>
                    </td>
                    <td className="max-w-xs truncate px-4 py-2.5">{o.nome}</td>
                    <td className="px-4 py-2.5">
                      <Etiqueta tom={s.tom}>{s.rotulo}</Etiqueta>
                    </td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-suave">
                      {[nomeEmpresa.get(o.empresa_id ?? ""), nomeContratante.get(o.contratante_id ?? "")].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{Number(o.valor_contratado) ? brl(o.valor_contratado, true) : "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{pct(o.pct_fisico_realizado)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {dataCivil(o.data_termino_contratual_vigente)}
                      {Number(o.dias_alem_do_prazo) > 0 && <span className="ml-1.5 text-xs text-alerta">+{o.dias_alem_do_prazo}d</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Cartao>
      )}
    </div>
  );
}
