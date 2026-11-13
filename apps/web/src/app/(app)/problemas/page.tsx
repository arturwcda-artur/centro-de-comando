import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { faixaGut } from "@/lib/gut";
import { UUID } from "@/lib/obras";
import { ABERTOS, ordenarFila, resumoGut, STATUS_PROBLEMA } from "@/lib/problemas";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Problemas" };

export default async function PaginaProblemas({ searchParams }: { searchParams: Promise<{ obra?: string; todos?: string }> }) {
  const { supabase } = await exigirSessaoCompleta();
  const { obra, todos } = await searchParams;
  const obraId = obra && UUID.test(obra) ? obra : null;
  const verTodos = todos === "1";

  let consulta = supabase.from("problemas").select("id, titulo, gravidade, urgencia, tendencia, gut, status, criado_em, obra_id, obras(codigo), pessoas(nome), tarefas(id, status)");
  if (obraId) consulta = consulta.eq("obra_id", obraId);
  if (!verTodos) consulta = consulta.in("status", ABERTOS);
  const [{ data, error }, obras] = await Promise.all([consulta, supabase.from("obras").select("id, codigo").is("arquivado_em", null).order("codigo")]);
  if (error) throw new Error(error.message);
  const fila = ordenarFila(data ?? []);
  const filtro = (extra: Record<string, string>) => `/problemas?${new URLSearchParams({ ...(obraId ? { obra: obraId } : {}), ...(verTodos ? { todos: "1" } : {}), ...extra })}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Problemas</h1>
          <p className="text-sm text-suave">Do mais grave para o menos grave, pela Matriz GUT (gravidade × urgência × tendência).</p>
        </div>
        <Link href="/problemas/novo" className="inline-flex h-10 items-center rounded-lg bg-marca px-4 text-sm font-medium text-white hover:opacity-90">
          Novo problema
        </Link>
      </div>

      <nav aria-label="Filtros" className="flex flex-wrap gap-2 text-xs">
        <Link href={obraId ? `/problemas?obra=${obraId}` : "/problemas"} aria-current={!verTodos ? "page" : undefined} className={`rounded-lg border px-3 py-1.5 font-medium ${!verTodos ? "border-marca bg-marca-suave" : "border-borda"}`}>
          Em aberto
        </Link>
        <Link href={`/problemas?${new URLSearchParams({ ...(obraId ? { obra: obraId } : {}), todos: "1" })}`} aria-current={verTodos ? "page" : undefined} className={`rounded-lg border px-3 py-1.5 font-medium ${verTodos ? "border-marca bg-marca-suave" : "border-borda"}`}>
          Todos
        </Link>
        <span className="mx-1 self-center text-suave">·</span>
        <Link href={verTodos ? "/problemas?todos=1" : "/problemas"} className={`rounded-lg border px-3 py-1.5 font-medium ${!obraId ? "border-marca bg-marca-suave" : "border-borda"}`}>
          Todas as obras
        </Link>
        {(obras.data ?? []).map((o) => (
          <Link key={o.id} href={filtro({ obra: o.id })} className={`rounded-lg border px-3 py-1.5 font-medium ${o.id === obraId ? "border-marca bg-marca-suave" : "border-borda"}`}>
            {o.codigo}
          </Link>
        ))}
      </nav>

      <Cartao>
        {fila.length === 0 ? (
          <EstadoVazio>Nenhum problema {verTodos ? "cadastrado" : "em aberto"}.</EstadoVazio>
        ) : (
          <ul className="divide-y divide-borda">
            {fila.map((p, i) => {
              const acoes = p.tarefas ?? [];
              const feitas = acoes.filter((a) => a.status === "concluida").length;
              return (
                <li key={p.id}>
                  <Link href={`/problemas/${p.id}`} className="flex items-start gap-3 py-3 hover:text-marca">
                    <span className="w-6 shrink-0 pt-0.5 text-right text-xs tabular-nums text-suave">{ABERTOS.includes(p.status) ? i + 1 : ""}</span>
                    <Etiqueta tom={faixaGut(p.gut)}>{p.gut}</Etiqueta>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{p.titulo}</span>
                      <span className="block text-xs text-suave">
                        {[p.obras?.codigo, p.pessoas?.nome, resumoGut(p), STATUS_PROBLEMA.find((s) => s.valor === p.status)?.rotulo].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-suave">{acoes.length ? `${feitas}/${acoes.length} ações` : "sem ação"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
