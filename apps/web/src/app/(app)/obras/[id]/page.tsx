import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Cartao, Etiqueta } from "@/components/ui";
import { rotuloSituacao } from "@/lib/dominio";
import { brl, dataCivil, dataHora, pct } from "@/lib/formato";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Obra" };

const ABAS = [
  { id: "visao", rotulo: "Visão geral" },
] as const;
const FUTURAS = [
  { rotulo: "Tarefas", fase: 5 },
  { rotulo: "Planejamento", fase: 6 },
  { rotulo: "Contratos e medições", fase: 7 },
  { rotulo: "Documentos", fase: 8 },
];

function Dado({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-suave">{rotulo}</dt>
      <dd className="mt-0.5 text-sm">{valor || "—"}</dd>
    </div>
  );
}

export default async function PaginaObra({ params, searchParams }: PageProps<"/obras/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const abaPedida = (await searchParams).aba;
  const aba = ABAS.find((a) => a.id === abaPedida)?.id ?? "visao";
  const { supabase } = await exigirSessaoCompleta();

  const [obra, resumo, problemas] = await Promise.all([
    supabase.from("obras").select("*, empresas(razao_social, nome_fantasia), contratantes(nome)").eq("id", id).is("arquivado_em", null).maybeSingle(),
    supabase.from("v_obra_resumo").select("*").eq("obra_id", id).maybeSingle(),
    supabase.from("problemas").select("gut").eq("obra_id", id).in("status", ["aberto", "em_andamento"]),
  ]);
  if (!obra.data) notFound();
  const o = obra.data;
  const r = resumo.data;
  const s = rotuloSituacao(o.situacao);
  const problemasAbertos = problemas.data ?? [];
  const problemasCriticos = problemasAbertos.filter((x) => (x.gut ?? 0) >= 64).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/obras" className="text-sm text-suave hover:text-texto">
            ← Obras
          </Link>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{o.nome}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-suave">
            <span className="font-medium text-texto">{o.codigo}</span>
            <Etiqueta tom={s.tom}>{s.rotulo}</Etiqueta>
            {o.cidade && <span>{[o.cidade, o.uf].filter(Boolean).join("/")}</span>}
          </p>
        </div>
        <Link href={`/obras/${id}/editar`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-borda bg-superficie px-3 text-sm hover:bg-superficie-2">
          <Pencil className="size-4" aria-hidden="true" /> Editar
        </Link>
      </div>

      <nav aria-label="Seções da obra" className="flex gap-1 overflow-x-auto border-b border-borda">
        {ABAS.map((a) => (
          <Link
            key={a.id}
            href={a.id === "visao" ? `/obras/${id}` : `/obras/${id}?aba=${a.id}`}
            aria-current={aba === a.id ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${aba === a.id ? "border-marca font-medium text-texto" : "border-transparent text-suave hover:text-texto"}`}
          >
            {a.rotulo}
          </Link>
        ))}
        {FUTURAS.map((f) => (
          <span key={f.rotulo} className="whitespace-nowrap px-3 py-2 text-sm text-suave/50" title={`Disponível na Fase ${f.fase}`}>
            {f.rotulo} <span className="text-[10px]">F{f.fase}</span>
          </span>
        ))}
      </nav>

      {aba === "visao" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Cartao titulo="Cadastro" className="lg:col-span-2">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Dado rotulo="Empresa executora" valor={o.empresas?.nome_fantasia || o.empresas?.razao_social} />
              <Dado rotulo="Contratante" valor={o.contratantes?.nome} />
              <Dado rotulo="Endereço" valor={o.endereco} />
              <Dado rotulo="Início" valor={dataCivil(o.data_inicio)} />
              <Dado rotulo="Término previsto (gerencial)" valor={dataCivil(o.data_termino_prevista)} />
              <Dado rotulo="Prazo contratual vigente" valor={dataCivil(r?.data_termino_contratual_vigente)} />
            </dl>
            {o.pasta_local && (
              <div className="mt-4">
                <p className="text-xs text-suave">Pasta no computador</p>
                <code className="mt-0.5 block break-all rounded bg-superficie-2 px-2 py-1 font-mono text-xs">{o.pasta_local}</code>
              </div>
            )}
            {o.observacoes && <p className="mt-4 whitespace-pre-line text-sm">{o.observacoes}</p>}
            <p className="mt-4 text-xs text-suave">Atualizado em {dataHora(o.atualizado_em)}</p>
          </Cartao>
          <Cartao titulo="Indicadores">
            <dl className="space-y-3">
              <Dado rotulo="Valor contratado" valor={brl(r?.valor_contratado)} />
              <Dado rotulo="Medido" valor={`${brl(r?.valor_medido)} · ${pct(r?.pct_financeiro)}`} />
              <Dado rotulo="Recebido" valor={brl(r?.valor_recebido)} />
              <Dado rotulo="Avanço físico (previsto / realizado)" valor={`${pct(r?.pct_fisico_previsto)} / ${pct(r?.pct_fisico_realizado)}`} />
              <Dado
                rotulo="Problemas em aberto · críticos"
                valor={
                  <Link href={`/problemas?obra=${id}`} className="hover:text-marca hover:underline">
                    {problemasAbertos.length} · {problemasCriticos}
                  </Link>
                }
              />
            </dl>
            <p className="mt-3 text-xs text-suave">Contratos e medições entram na Fase 7; avanço físico, na Fase 6.</p>
          </Cartao>
        </div>
      )}

    </div>
  );
}
