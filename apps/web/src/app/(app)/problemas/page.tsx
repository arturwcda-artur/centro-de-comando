import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { faixaGut } from "@/lib/gut";
import { UUID } from "@/lib/obras";
import { ABAS, abaDe, ordenarFila, resumoGut } from "@/lib/problemas";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { CadastroRapido } from "./cadastro-rapido";

export const metadata: Metadata = { title: "Problemas" };

export default async function PaginaProblemas({ searchParams }: { searchParams: Promise<{ obra?: string; aba?: string }> }) {
  const { supabase } = await exigirSessaoCompleta();
  const { obra, aba: abaBruta } = await searchParams;
  const obraId = obra && UUID.test(obra) ? obra : null;
  const aba = abaDe(abaBruta);

  let consulta = supabase.from("problemas").select("id, titulo, gravidade, urgencia, tendencia, gut, status, criado_em, obra_id, obras(codigo), pessoas(nome), tarefas(id, status, prazo)");
  if (obraId) consulta = consulta.eq("obra_id", obraId);
  const [{ data, error }, obras] = await Promise.all([consulta, supabase.from("obras").select("id, codigo, nome").is("arquivado_em", null).order("codigo")]);
  if (error) throw new Error(error.message);
  const todos = data ?? [];
  const contar = (status: readonly string[]) => todos.filter((p) => status.includes(p.status)).length;
  const fila = ordenarFila(todos.filter((p) => (aba.status as readonly string[]).includes(p.status)));
  const link = (extra: { aba?: string; obra?: string | null }) => {
    const q = new URLSearchParams();
    const a = extra.aba ?? aba.valor;
    const o = extra.obra === undefined ? obraId : extra.obra;
    if (a !== "pendentes") q.set("aba", a);
    if (o) q.set("obra", o);
    return `/problemas${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Problemas</h1>
          <p className="text-sm text-suave">Do mais grave para o menos grave, pela Matriz GUT. Um problema com plano sai de Pendentes; com todas as ações feitas, vai para Concluídos.</p>
        </div>
      </div>

      <nav aria-label="Etapa" className="grid grid-cols-3 gap-2">
        {ABAS.map((a) => (
          <Link
            key={a.valor}
            href={link({ aba: a.valor })}
            aria-current={a.valor === aba.valor ? "page" : undefined}
            className={`rounded-xl border p-3 ${a.valor === aba.valor ? "border-marca bg-marca-suave" : "border-borda hover:bg-superficie-2"}`}
          >
            <span className="block text-sm font-medium">{a.rotulo}</span>
            <span className="block text-2xl font-semibold tabular-nums">{contar(a.status)}</span>
            <span className="block text-xs text-suave">{a.ajuda}</span>
          </Link>
        ))}
      </nav>

      <nav aria-label="Obra" className="flex flex-wrap gap-2 text-xs">
        <Link href={link({ obra: null })} className={`rounded-lg border px-3 py-1.5 font-medium ${!obraId ? "border-marca bg-marca-suave" : "border-borda"}`}>
          Todas as obras
        </Link>
        {(obras.data ?? []).map((o) => (
          <Link key={o.id} href={link({ obra: o.id })} className={`rounded-lg border px-3 py-1.5 font-medium ${o.id === obraId ? "border-marca bg-marca-suave" : "border-borda"}`}>
            {o.codigo}
          </Link>
        ))}
      </nav>

      {aba.valor === "pendentes" && (
        <Cartao>
          <details>
            <summary className="cursor-pointer text-sm font-medium">+ Adicionar problema</summary>
            <div className="mt-3">
              <CadastroRapido obras={(obras.data ?? []).map((o) => ({ valor: o.id, rotulo: `${o.codigo} — ${o.nome}` }))} />
            </div>
          </details>
        </Cartao>
      )}

      <Cartao>
        {fila.length === 0 ? (
          <EstadoVazio>Nenhum problema em {aba.rotulo.toLowerCase()}.</EstadoVazio>
        ) : (
          <ul className="divide-y divide-borda">
            {fila.map((p, i) => {
              const acoes = (p.tarefas ?? []).filter((a) => a.status !== "cancelada");
              const feitas = acoes.filter((a) => a.status === "concluida").length;
              const proximo = acoes.filter((a) => a.status !== "concluida" && a.prazo).map((a) => a.prazo as string).sort()[0];
              return (
                <li key={p.id}>
                  <Link href={`/problemas/${p.id}`} className="flex items-start gap-3 py-3 hover:text-marca">
                    <span className="w-6 shrink-0 pt-0.5 text-right text-xs tabular-nums text-suave">{aba.valor === "concluidos" ? "" : i + 1}</span>
                    <Etiqueta tom={faixaGut(p.gut)}>{p.gut}</Etiqueta>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{p.titulo}</span>
                      <span className="block text-xs text-suave">{[p.obras?.codigo, p.pessoas?.nome, resumoGut(p)].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs tabular-nums text-suave">
                      {acoes.length ? `${feitas}/${acoes.length} ações` : "sem plano"}
                      {proximo && <span className="block">próxima: {proximo.split("-").reverse().join("/")}</span>}
                    </span>
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
