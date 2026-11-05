import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { LinhaTarefa } from "@/components/linha-tarefa";
import { Cartao, EstadoVazio } from "@/components/ui";
import { VISOES_TAREFA, type VisaoTarefa } from "@/lib/dominio";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { contarVisoes, tarefasDaVisao } from "@/lib/tarefas";

export const metadata: Metadata = { title: "Tarefas" };

const ORIGENS = [
  { valor: "manual", rotulo: "Criadas aqui" },
  { valor: "trello", rotulo: "Trello" },
  { valor: "notion", rotulo: "Notion" },
];

export default async function PaginaTarefas({ searchParams }: PageProps<"/tarefas">) {
  const params = await searchParams;
  const quadro = typeof params.quadro === "string" && params.quadro ? params.quadro : null;
  // Com um quadro escolhido, abre em Todas: em Minhas atribuições os cartões de outros membros não aparecem
  const visao = (VISOES_TAREFA.find((v) => v.valor === params.visao)?.valor ?? (quadro ? "todas" : "minhas")) as VisaoTarefa;
  const obraId = typeof params.obra === "string" && UUID.test(params.obra) ? params.obra : null;
  const fonte = ORIGENS.some((o) => o.valor === params.origem) ? (params.origem as string) : null;
  const { supabase } = await exigirSessaoCompleta();

  const [lista, contagem, obras] = await Promise.all([
    tarefasDaVisao(supabase, visao, obraId, fonte, quadro),
    contarVisoes(supabase),
    supabase.from("obras").select("id, codigo, nome").is("arquivado_em", null).order("codigo"),
  ]);
  const nomeObra = new Map((obras.data ?? []).map((o) => [o.id, o.codigo]));
  const itens = visao === "concluidas" ? lista.concluidas : lista.abertas;
  const sufixo = `${obraId ? `&obra=${obraId}` : ""}${fonte ? `&origem=${fonte}` : ""}${quadro ? `&quadro=${encodeURIComponent(quadro)}` : ""}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-sm text-suave">Ordenadas pela prioridade: 3·urgência + 2·importância + 2·impacto. Os prazos nunca são alterados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form method="get" className="flex flex-wrap gap-2">
            {visao !== "minhas" && <input type="hidden" name="visao" value={visao} />}
            <select name="obra" defaultValue={obraId ?? ""} aria-label="Filtrar por obra" className="h-10 rounded-lg border border-borda bg-superficie px-2 text-sm">
              <option value="">Todas as obras</option>
              {(obras.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.codigo}
                </option>
              ))}
            </select>
            <select name="origem" defaultValue={fonte ?? ""} aria-label="Filtrar por origem" className="h-10 rounded-lg border border-borda bg-superficie px-2 text-sm">
              <option value="">Todas as origens</option>
              {ORIGENS.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
            <select name="quadro" defaultValue={quadro ?? ""} aria-label="Filtrar por quadro do Trello" className="h-10 max-w-48 rounded-lg border border-borda bg-superficie px-2 text-sm">
              <option value="">Todos os quadros</option>
              {contagem.quadros.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
            <button className="h-10 rounded-lg border border-borda bg-superficie px-3 text-sm hover:bg-superficie-2">Filtrar</button>
          </form>
          <Link href="/tarefas/nova" className="inline-flex h-10 items-center gap-2 rounded-lg bg-marca px-3 text-sm font-medium text-white hover:opacity-90">
            <Plus className="size-4" aria-hidden="true" /> Nova tarefa
          </Link>
        </div>
      </div>

      <nav aria-label="Visões" className="flex gap-1 overflow-x-auto border-b border-borda">
        {VISOES_TAREFA.map((v) => {
          const n = contagem[v.valor];
          return (
            <Link
              key={v.valor}
              href={`/tarefas?visao=${v.valor}${sufixo}`}
              aria-current={v.valor === visao ? "page" : undefined}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${v.valor === visao ? "border-marca font-medium" : "border-transparent text-suave hover:text-texto"}`}
            >
              {v.rotulo}
              {n !== null && n > 0 && <span className="ml-1.5 text-xs text-suave">{n}</span>}
            </Link>
          );
        })}
      </nav>

      <Cartao>
        {itens.length === 0 ? (
          <EstadoVazio>Nenhuma tarefa nesta visão.</EstadoVazio>
        ) : (
          <ul className="divide-y divide-borda">
            {itens.map((t) => (
              <LinhaTarefa key={t.id} t={t} nomeObra={t.obra_id ? nomeObra.get(t.obra_id) : undefined} />
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
