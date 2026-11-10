import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { AlterarStatus } from "@/components/alterar-status";
import { Aviso, Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { STATUS_DECISAO, STATUS_RISCO, nivelSeveridade, rotuloSituacao } from "@/lib/dominio";
import { brl, dataCivil, dataHora, pct } from "@/lib/formato";
import { carregarOpcoes, UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { FormularioDecisao, FormularioRisco } from "./formularios";

export const metadata: Metadata = { title: "Obra" };

const ABAS = [
  { id: "visao", rotulo: "Visão geral" },
  { id: "riscos", rotulo: "Riscos" },
  { id: "decisoes", rotulo: "Decisões" },
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

  const [obra, resumo, riscos, decisoes, opcoes, plano, acoes] = await Promise.all([
    supabase.from("obras").select("*, empresas(razao_social, nome_fantasia), contratantes(nome)").eq("id", id).is("arquivado_em", null).maybeSingle(),
    supabase.from("v_obra_resumo").select("*").eq("obra_id", id).maybeSingle(),
    supabase.from("riscos").select("*, pessoas(nome)").eq("obra_id", id).order("severidade", { ascending: false }),
    supabase.from("decisoes").select("*, pessoas(nome)").eq("obra_id", id).order("criado_em", { ascending: false }),
    carregarOpcoes(supabase),
    supabase.from("acoes_planilhas").select("caminho, ultima_leitura_em, ultimo_erro").eq("obra_id", id).maybeSingle(),
    supabase.from("v_tarefas_priorizadas").select("vencida, critica, escore, status_sync").eq("obra_id", id).eq("fonte", "planilha"),
  ]);
  if (!obra.data) notFound();
  const o = obra.data;
  const r = resumo.data;
  const s = rotuloSituacao(o.situacao);
  const riscosAbertos = (riscos.data ?? []).filter((x) => x.status === "aberto" || x.status === "em_tratamento");
  const decisoesPendentes = (decisoes.data ?? []).filter((x) => x.status === "pendente");
  const acoesAbertas = acoes.data ?? [];
  const acoesVencidas = acoesAbertas.filter((x) => x.vencida).length;
  const acoesCriticas = acoesAbertas.filter((x) => x.critica).length;
  const acoesForaDaPlanilha = acoesAbertas.filter((x) => x.status_sync === "pendente").length;

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
            {a.id === "riscos" && riscosAbertos.length > 0 && <span className="ml-1.5 text-xs text-suave">{riscosAbertos.length}</span>}
            {a.id === "decisoes" && decisoesPendentes.length > 0 && <span className="ml-1.5 text-xs text-suave">{decisoesPendentes.length}</span>}
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
              <Dado rotulo="Riscos abertos · decisões pendentes" valor={`${riscosAbertos.length} · ${decisoesPendentes.length}`} />
            </dl>
            <p className="mt-3 text-xs text-suave">Contratos e medições entram na Fase 7; avanço físico, na Fase 6.</p>
          </Cartao>
          {plano.data && (
            <Cartao titulo="Plano de ações" className="lg:col-span-3">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Dado rotulo="Ações abertas" valor={String(acoesAbertas.length)} />
                <Dado rotulo="Vencidas" valor={String(acoesVencidas)} />
                <Dado rotulo="Críticas (GUT ≥ 64)" valor={String(acoesCriticas)} />
                <Dado rotulo="Última leitura da planilha" valor={dataHora(plano.data.ultima_leitura_em)} />
              </dl>
              {plano.data.ultimo_erro && (
                <div className="mt-3">
                  <Aviso>Erro na última leitura: {plano.data.ultimo_erro}</Aviso>
                </div>
              )}
              {acoesForaDaPlanilha > 0 && (
                <div className="mt-3">
                  <Aviso>{acoesForaDaPlanilha} ação(ões) abertas aqui não estão mais na planilha: confira se alguma linha foi apagada ou movida.</Aviso>
                </div>
              )}
              <p className="mt-3 text-xs text-suave">
                Fonte: <code className="break-all font-mono">{plano.data.caminho}</code>. As ações são atualizadas na planilha; aqui só são mostradas.{" "}
                <Link href={`/tarefas?obra=${id}`} className="underline hover:text-texto">
                  Ver as ações
                </Link>
              </p>
            </Cartao>
          )}
        </div>
      )}

      {aba === "riscos" && (
        <div className="grid gap-4 lg:grid-cols-5">
          <Cartao titulo="Riscos da obra" className="lg:col-span-3">
            {(riscos.data ?? []).length === 0 ? (
              <EstadoVazio>Nenhum risco registrado.</EstadoVazio>
            ) : (
              <ul className="divide-y divide-borda">
                {(riscos.data ?? []).map((x) => {
                  const n = nivelSeveridade(x.severidade ?? 0);
                  return (
                    <li key={x.id} className="flex flex-wrap items-start gap-3 py-3">
                      <span title="Severidade = probabilidade × impacto (RN-50)" className="w-14 shrink-0">
                        <Etiqueta tom={n.tom}>{x.severidade}</Etiqueta>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{x.descricao}</p>
                        <p className="mt-0.5 text-xs text-suave">
                          P{x.probabilidade} × I{x.impacto} · {n.rotulo}
                          {x.pessoas?.nome && ` · ${x.pessoas.nome}`}
                          {x.prazo && ` · até ${dataCivil(x.prazo)}`}
                        </p>
                        {x.plano_resposta && <p className="mt-1 text-xs">{x.plano_resposta}</p>}
                      </div>
                      <AlterarStatus tabela="riscos" id={x.id} obraId={id} atual={x.status} opcoes={STATUS_RISCO} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Cartao>
          <Cartao titulo="Registrar risco" className="lg:col-span-2">
            <FormularioRisco obraId={id} pessoas={opcoes.pessoas} />
          </Cartao>
        </div>
      )}

      {aba === "decisoes" && (
        <div className="grid gap-4 lg:grid-cols-5">
          <Cartao titulo="Decisões gerenciais" className="lg:col-span-3">
            {(decisoes.data ?? []).length === 0 ? (
              <EstadoVazio>Nenhuma decisão registrada.</EstadoVazio>
            ) : (
              <ul className="divide-y divide-borda">
                {(decisoes.data ?? []).map((x) => (
                  <li key={x.id} className="flex flex-wrap items-start gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{x.problema}</p>
                      {x.decisao && <p className="mt-0.5 text-sm">→ {x.decisao}</p>}
                      <p className="mt-0.5 text-xs text-suave">
                        {x.pessoas?.nome ?? "Sem responsável"}
                        {x.prazo && ` · prazo ${dataCivil(x.prazo)}`}
                        {x.data_decisao && ` · decidido em ${dataCivil(x.data_decisao)}`}
                      </p>
                    </div>
                    <AlterarStatus tabela="decisoes" id={x.id} obraId={id} atual={x.status} opcoes={STATUS_DECISAO} />
                  </li>
                ))}
              </ul>
            )}
          </Cartao>
          <Cartao titulo="Registrar decisão" className="lg:col-span-2">
            <FormularioDecisao obraId={id} pessoas={opcoes.pessoas} />
          </Cartao>
        </div>
      )}
    </div>
  );
}
