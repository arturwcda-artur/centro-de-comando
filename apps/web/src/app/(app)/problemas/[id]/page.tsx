import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { carregarOpcoes, UUID } from "@/lib/obras";
import { dataCivil, hojeSP } from "@/lib/formato";
import { dataSugeridaLembrete, faixaGut } from "@/lib/gut";
import { GRAVIDADE, STATUS_PROBLEMA, TENDENCIA, URGENCIA } from "@/lib/problemas";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { alternarAcao, concluirProblema, salvarAcao5w2h } from "../acoes";
import { FormularioAcao5w2h } from "../formularios";
import { FormularioLembrete } from "./formulario-lembrete";

export const metadata: Metadata = { title: "Problema" };

export default async function PaginaProblema({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await exigirSessaoCompleta();
  const [{ data: p }, opcoes] = await Promise.all([
    supabase
      .from("problemas")
      .select("*, obras(codigo, nome), pessoas(nome), tarefas(id, titulo, prazo, status, pessoas!tarefas_responsavel_id_fkey(nome), acoes_detalhes(*))")
      .eq("id", id)
      .maybeSingle(),
    carregarOpcoes(supabase),
  ]);
  if (!p) notFound();
  const acoes = [...(p.tarefas ?? [])].sort((a, b) => Number(a.status === "concluida") - Number(b.status === "concluida") || (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999"));
  const notas = [
    ["Gravidade", p.gravidade, GRAVIDADE[p.gravidade - 1]],
    ["Urgência", p.urgencia, URGENCIA[p.urgencia - 1]],
    ["Tendência", p.tendencia, TENDENCIA[p.tendencia - 1]],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link href="/problemas" className="text-sm text-suave hover:text-texto">
          ← Problemas
        </Link>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{p.titulo}</h1>
          <div className="flex shrink-0 gap-2">
            <form action={concluirProblema.bind(null, id, p.status !== "resolvido")}>
              <button className={`rounded-lg px-3 py-1.5 text-xs font-medium ${p.status === "resolvido" ? "border border-borda hover:bg-superficie-2" : "bg-marca text-white hover:opacity-90"}`}>
                {p.status === "resolvido" ? "Reabrir problema" : "Concluir problema"}
              </button>
            </form>
            <Link href={`/problemas/${id}/editar`} className="rounded-lg border border-borda px-3 py-1.5 text-xs font-medium hover:bg-superficie-2">
              Editar
            </Link>
          </div>
        </div>
        <p className="text-sm text-suave">
          {[p.obras?.codigo, p.pessoas?.nome ?? "Responsável: eu", STATUS_PROBLEMA.find((s) => s.valor === p.status)?.rotulo].filter(Boolean).join(" · ")}
          {p.origem === "planilha" && " · veio da planilha da Central de Gestão"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cartao>
          <p className="text-xs text-suave">GUT</p>
          <p className="mt-1 text-lg font-semibold">
            <Etiqueta tom={faixaGut(p.gut)}>{p.gut}</Etiqueta>
          </p>
        </Cartao>
        {notas.map(([rotulo, nota, texto]) => (
          <Cartao key={rotulo}>
            <p className="text-xs text-suave">{rotulo}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{nota}</p>
            <p className="text-xs text-suave">{texto}</p>
          </Cartao>
        ))}
      </div>

      {p.descricao && (
        <Cartao titulo="Detalhes">
          <p className="whitespace-pre-wrap text-sm">{p.descricao}</p>
        </Cartao>
      )}

      <Cartao titulo={`Plano de ação 5W2H (${acoes.length})`}>
        {acoes.length === 0 ? (
          <EstadoVazio>Nenhuma ação ainda. Adicione abaixo o que será feito para resolver.</EstadoVazio>
        ) : (
          <ul className="space-y-4">
            {acoes.map((a) => {
              const d = a.acoes_detalhes;
              const feita = a.status === "concluida";
              const linhas: [string, string | null | undefined][] = [
                ["Por quê", d?.por_que],
                ["Onde", d?.onde],
                ["Quando", a.prazo ? dataCivil(a.prazo) : null],
                ["Quem", a.pessoas?.nome ?? d?.quem],
                ["Como", d?.como],
                ["Quanto", d?.quanto],
              ];
              return (
                <li key={a.id} className={`rounded-lg border border-borda p-3 ${feita ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className={`font-medium ${feita ? "line-through" : ""}`}>{d?.o_que ?? a.titulo}</p>
                    <div className="flex shrink-0 gap-2">
                      <Link href={`/problemas/${id}/acoes/${a.id}`} className="rounded-lg border border-borda px-2.5 py-1 text-xs hover:bg-superficie-2">
                        Editar
                      </Link>
                      <form action={alternarAcao.bind(null, id, a.id, !feita)}>
                        <button className="rounded-lg border border-borda px-2.5 py-1 text-xs hover:bg-superficie-2">{feita ? "Reabrir" : "Concluir"}</button>
                      </form>
                    </div>
                  </div>
                  <dl className="mt-2 grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[5rem_1fr]">
                    {linhas
                      .filter(([, v]) => v)
                      .map(([r, v]) => (
                        <div key={r} className="contents">
                          <dt className="text-suave">{r}</dt>
                          <dd className="whitespace-pre-wrap">{v}</dd>
                        </div>
                      ))}
                  </dl>
                  {!feita && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-marca">Criar lembrete na agenda</summary>
                      <div className="mt-2">
                        <FormularioLembrete tarefaId={a.id} dataSugerida={dataSugeridaLembrete(a.prazo, hojeSP())} prazo={a.prazo ? dataCivil(a.prazo) : null} />
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Cartao>

      <Cartao>
        <details>
          <summary className="cursor-pointer text-sm font-medium">Adicionar ação 5W2H</summary>
          <div className="mt-4">
            <FormularioAcao5w2h acao={salvarAcao5w2h.bind(null, id, null)} pessoas={opcoes.pessoas} />
          </div>
        </details>
      </Cartao>
    </div>
  );
}
