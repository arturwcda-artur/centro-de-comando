import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, EstadoVazio } from "@/components/ui";
import { GraficoSemanas } from "@/components/grafico-semanas";
import { DIAS_PARADA, QUADRO_EQUIPE, QUADROS_EQUIPE, SEM_RESPONSAVEL, quadroEquipeDe, type Geracao, type LinhaEquipe, type PosicaoEvolucao, type Resolvida } from "@/lib/equipe";
import { painelDaEquipe, type Situacao } from "@/lib/equipe-dados";
import { dataCivil, dataHora, hojeSP, somarDias } from "@/lib/formato";
import { FOLGA_FECHAMENTO, janelaAnterior, janelaDe, lerJanela, linkDaJanela, rotuloDaJanela, type Janela } from "@/lib/placar";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Equipe" };

const quantidade = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const comSinal = (n: number | null) => (n === null ? "—" : n > 0 ? `+${quantidade(n)}` : n < 0 ? `−${quantidade(Math.abs(n))}` : "0");
const corDoSinal = (n: number | null) => (n === null || n === 0 ? "" : n > 0 ? "text-ok" : "text-alerta");
const dias = (d: number | null) => (d === null ? "—" : `${d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`);

const NUMERO = "py-2.5 text-right tabular-nums";
const CABECALHO = "py-2 text-right font-medium";

/** Quanto cada um resolve, em quanto tempo e como está evoluindo. Sem posições. */
function Painel({ coluna, linhas, evolucao, destino }: { coluna: string; linhas: LinhaEquipe[]; evolucao: (nome: string, atual: number) => number | null; destino: (nome: string) => string | null }) {
  if (linhas.length === 0) return <EstadoVazio>Nenhuma tarefa neste período.</EstadoVazio>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="text-left text-xs text-suave">
          <tr>
            <th className="py-2 font-medium">{coluna}</th>
            <th className={CABECALHO}>Tarefas resolvidas</th>
            <th className={CABECALHO}>Tempo médio</th>
            <th className={CABECALHO}>Evolução</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borda">
          {linhas.map((l) => {
            const semDono = l.nome === SEM_RESPONSAVEL;
            const link = destino(l.nome);
            const variacao = evolucao(l.nome, l.resolvidas);
            return (
              <tr key={l.nome} className={semDono ? "text-suave" : undefined}>
                <td className="py-2.5 pr-3">
                  {link ? (
                    <Link href={link} className="hover:text-marca hover:underline">
                      {l.nome}
                    </Link>
                  ) : (
                    l.nome
                  )}
                </td>
                <td className={`${NUMERO} ${semDono ? "" : "font-semibold"}`}>{quantidade(l.resolvidas)}</td>
                <td className={NUMERO}>{dias(l.diasPorTarefa)}</td>
                <td className={`${NUMERO} font-medium ${corDoSinal(variacao)}`}>{comSinal(variacao)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Quem mais evoluiu em relação ao período anterior. Todos aparecem, inclusive quem caiu. */
/** Separa itens de checklist e cartões, que é o que explica o número. */
const composicao = (lista: Resolvida[] = []) => {
  const itens = lista.filter((r) => r.item).reduce((s, r) => s + r.parte, 0);
  const cartoes = lista.filter((r) => !r.item).reduce((s, r) => s + r.parte, 0);
  return `${quantidade(itens)} ${itens === 1 ? "item" : "itens"} de checklist e ${quantidade(cartoes)} ${cartoes === 1 ? "cartão" : "cartões"}`;
};
const dataCurta = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) : "—");
const LIMITE_LISTA = 60;

function RankingEvolucao({ linhas, semana, atual, antes }: { linhas: PosicaoEvolucao[]; semana: boolean; atual: Record<string, Resolvida[]>; antes: Record<string, Resolvida[]> | null }) {
  const nomeAntes = semana ? "Na semana anterior" : "No mês anterior";
  const nomeAgora = semana ? "Nesta semana" : "Neste mês";
  return (
    <div className="space-y-4">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead className="text-left text-xs text-suave">
          <tr>
            <th className="w-10 py-2 font-medium">#</th>
            <th className="py-2 font-medium">Responsável</th>
            <th className={CABECALHO}>{semana ? "Semana anterior" : "Mês anterior"}</th>
            <th className={CABECALHO}>{semana ? "Esta semana" : "Este mês"}</th>
            <th className={CABECALHO}>Evolução</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borda">
          {linhas.map((l) => (
            <tr key={l.nome}>
              <td className="py-2.5 font-semibold tabular-nums">{l.posicao ? `${l.posicao}º` : "—"}</td>
              <td className="py-2.5 pr-3">
                {l.nome}
                {l.posicao === null && <span className="ml-2 text-xs text-suave">sem entregas no período</span>}
              </td>
              <td className={`${NUMERO} text-suave`}>{quantidade(l.anterior)}</td>
              <td className={NUMERO}>{quantidade(l.atual)}</td>
              <td className={`${NUMERO} font-semibold ${corDoSinal(l.evolucao)}`}>{comSinal(l.evolucao)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-suave">O que explica a evolução de cada um</p>
        {linhas.map((l) => {
          const lista = atual[l.nome] ?? [];
          return (
            <details key={l.nome} className="rounded-lg border border-borda px-3 py-2 text-sm">
              <summary className="cursor-pointer">
                <span className="font-medium">{l.nome}</span>: {quantidade(l.anterior)} → {quantidade(l.atual)}
              </summary>
              <div className="mt-2 space-y-2">
                <p className="text-xs text-suave">
                  {nomeAntes}: {composicao(antes?.[l.nome])}. {nomeAgora}: {composicao(lista)}.
                </p>
                {lista.length === 0 ? (
                  <p className="text-xs text-suave">Nada resolvido {nomeAgora.toLowerCase()}.</p>
                ) : (
                  <ul className="divide-y divide-borda">
                    {lista.slice(0, LIMITE_LISTA).map((r, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 py-1.5">
                        <span className="min-w-0">
                          <span className="block truncate">{r.item ?? r.cartao}</span>
                          <span className="block truncate text-xs text-suave">{r.item ? r.cartao : "Cartão concluído"}</span>
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-suave">
                          {dataCurta(r.data)}
                          {r.parte < 1 ? ` · ${quantidade(r.parte)}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {lista.length > LIMITE_LISTA && <p className="text-xs text-suave">E mais {lista.length - LIMITE_LISTA}.</p>}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

/** Quem abre trabalho no Trello: cartões, checklists e comentários. Sem posições. */
function QuemGerou({ linhas, evolucao }: { linhas: Geracao[]; evolucao: (nome: string, total: number) => number | null }) {
  if (linhas.length === 0) return <EstadoVazio>Ninguém criou cartão, checklist ou comentário no período.</EstadoVazio>;
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs text-suave">
            <tr>
              <th className="py-2 font-medium">Pessoa</th>
              <th className={CABECALHO}>Cartões criados</th>
              <th className={CABECALHO}>Checklists</th>
              <th className={CABECALHO}>Comentários</th>
              <th className={CABECALHO}>Total</th>
              <th className={CABECALHO}>Evolução</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">
            {linhas.map((l) => {
              const variacao = evolucao(l.nome, l.total);
              return (
                <tr key={l.nome}>
                  <td className="py-2.5 pr-3">{l.nome}</td>
                  <td className={NUMERO}>{l.cartoes}</td>
                  <td className={NUMERO}>{l.checklists}</td>
                  <td className={NUMERO}>{l.comentarios}</td>
                  <td className={`${NUMERO} font-semibold`}>{l.total}</td>
                  <td className={`${NUMERO} font-medium ${corDoSinal(variacao)}`}>{comSinal(variacao)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-suave">Itens de checklist não entram: o Trello não registra quem cria cada item.</p>
    </div>
  );
}

/** O restante fica à parte, para a tela principal continuar simples. */
function Detalhes({ linhas }: { linhas: LinhaEquipe[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="text-left text-xs text-suave">
          <tr>
            <th className="py-2 font-medium">Responsável</th>
            <th className={CABECALHO}>Atribuídas</th>
            <th className={CABECALHO}>Abertas</th>
            <th className={CABECALHO}>Concluídas</th>
            <th className={CABECALHO}>Itens resolvidos</th>
            <th className={CABECALHO}>Vencidas</th>
            <th className={CABECALHO}>No prazo</th>
            <th className={CABECALHO}>Prazos alterados</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borda">
          {linhas.map((l) => (
            <tr key={l.nome}>
              <td className="py-2 pr-3">{l.nome}</td>
              <td className="py-2 text-right tabular-nums">{l.atribuidas}</td>
              <td className="py-2 text-right tabular-nums">{l.abertas}</td>
              <td className="py-2 text-right tabular-nums">{l.concluidas}</td>
              <td className="py-2 text-right tabular-nums">{quantidade(l.itensResolvidos)}</td>
              <td className={`py-2 text-right tabular-nums ${l.vencidas > 0 ? "font-medium text-alerta" : ""}`}>{l.vencidas}</td>
              <td className={`py-2 text-right font-medium tabular-nums ${corDoSinal(l.saldoPrazo)}`} title={l.cobraveis > 0 ? `${l.noPrazo} no prazo e ${l.cobraveis - l.noPrazo} atrasados` : "Sem cartões com prazo cobrável"}>
                {comSinal(l.saldoPrazo)}
              </td>
              <td className="py-2 text-right tabular-nums">{l.prazosAlterados}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SITUACAO: Record<Situacao, { rotulo: string; classe: string }> = {
  oficial: { rotulo: "Placar oficial", classe: "border-ok text-ok" },
  parcial: { rotulo: "Parcial", classe: "border-borda text-suave" },
  aguardando: { rotulo: "Parcial · fecha amanhã", classe: "border-borda text-suave" },
  recalculado: { rotulo: "Calculado agora · antes do placar oficial", classe: "border-borda text-suave" },
  todos: { rotulo: "Todo o período", classe: "border-borda text-suave" },
};

export default async function PaginaEquipe({ searchParams }: PageProps<"/equipe">) {
  const { periodo: bruto, ref, quadro: quadroBruto } = await searchParams;
  const hoje = hojeSP();
  const janela = lerJanela(bruto, ref, hoje);
  const quadro = quadroEquipeDe(quadroBruto);
  const sufixoQuadro = quadro === QUADRO_EQUIPE ? "" : `&quadro=${encodeURIComponent(quadro)}`;
  const { supabase } = await exigirSessaoCompleta();
  const p = await painelDaEquipe(supabase, quadro, janela);
  const { total, porLista, porResponsavel, entraram, saldo: saldoDoPeriodo, evolucaoEquipe, ranking, resolvidasNoPeriodo, resolvidasAntes } = p.resumo;
  const evolucaoPessoa = (nome: string) => p.resumo.evolucaoPessoa[nome] ?? null;
  const evolucaoLista = (nome: string) => p.resumo.evolucaoLista[nome] ?? null;
  const semana = janela.tipo === "semana";
  const mesmaJanela = (j: Janela) => j.tipo === janela.tipo && j.inicio === janela.inicio;
  const atalhos: Janela[] = [janelaDe("semana", hoje), janelaDe("mes", hoje), { tipo: "todos", inicio: null, fim: null }];
  const anterior = janelaAnterior(janela);
  const situacao = SITUACAO[p.situacao];

  const indicadores = [
    ["Tarefas resolvidas", quantidade(total?.resolvidas ?? 0), ""],
    ["Entraram", quantidade(entraram), ""],
    ["Saldo", comSinal(saldoDoPeriodo), corDoSinal(saldoDoPeriodo)],
    ["Tempo médio", dias(total?.diasPorTarefa ?? null), ""],
    ["Evolução", comSinal(evolucaoEquipe), corDoSinal(evolucaoEquipe)],
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
        <p className="text-sm text-suave">Quadro {quadro}, conforme a última sincronização do Trello ({dataHora(p.ultimaSync)}).</p>
      </div>

      <nav aria-label="Quadro" className="flex flex-wrap gap-1 border-b border-borda">
        {QUADROS_EQUIPE.map((q) => (
          <Link
            key={q}
            href={`/equipe?${linkDaJanela(janela)}${q === QUADRO_EQUIPE ? "" : `&quadro=${encodeURIComponent(q)}`}`}
            aria-current={q === quadro ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${q === quadro ? "border-marca font-medium" : "border-transparent text-suave hover:text-texto"}`}
          >
            {q}
          </Link>
        ))}
      </nav>

      <nav aria-label="Período" className="flex flex-wrap items-center gap-2">
        {atalhos.map((j) => (
          <Link
            key={linkDaJanela(j)}
            href={`/equipe?${linkDaJanela(j)}${sufixoQuadro}`}
            aria-current={mesmaJanela(j) ? "page" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${mesmaJanela(j) ? "border-marca bg-marca-suave" : "border-borda hover:bg-superficie-2"}`}
          >
            {j.tipo === "semana" ? "Esta semana" : j.tipo === "mes" ? "Este mês" : "Todo o período"}
          </Link>
        ))}
        {anterior && (
          <Link href={`/equipe?${linkDaJanela(anterior)}${sufixoQuadro}`} className="rounded-lg border border-borda px-3 py-1.5 text-xs font-medium hover:bg-superficie-2">
            ← {semana ? "Semana anterior" : "Mês anterior"}
          </Link>
        )}
        <Link href={`/relatorios/equipe?${linkDaJanela(janela)}${sufixoQuadro}`} target="_blank" className="ml-auto rounded-lg border border-borda px-3 py-1.5 text-xs font-medium hover:bg-superficie-2">
          PDF deste placar
        </Link>
      </nav>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{rotuloDaJanela(janela)}</span>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${situacao.classe}`}>{situacao.rotulo}</span>
        {p.fechadoEm && <span className="text-xs text-suave">fechado em {dataHora(p.fechadoEm)}; não muda mais</span>}
        {p.situacao === "parcial" && janela.fim && <span className="text-xs text-suave">vira placar oficial em {dataCivil(somarDias(janela.fim, FOLGA_FECHAMENTO))}</span>}
      </div>
      {p.avisoPlacar && <p className="text-xs text-alerta">Placar oficial indisponível agora: {p.avisoPlacar}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {indicadores.map(([rotulo, valor, cor]) => (
          <Cartao key={rotulo}>
            <p className="text-xs text-suave">{rotulo}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${cor}`}>{valor}</p>
          </Cartao>
        ))}
      </div>

      <Cartao titulo="Quem resolveu">
        <Painel coluna="Responsável" linhas={porResponsavel} evolucao={evolucaoPessoa} destino={(nome) => (p.idMembro.has(nome) ? `/tarefas?membro=${p.idMembro.get(nome)}` : null)} />
      </Cartao>

      <Cartao titulo="Quem mais evoluiu">
        {ranking ? (
          <RankingEvolucao linhas={ranking} semana={semana} atual={resolvidasNoPeriodo} antes={resolvidasAntes} />
        ) : (
          <EstadoVazio>{janela.tipo !== "todos" ? "Ainda não há resolvidas no período anterior para comparar." : "Escolha a semana ou o mês para comparar com o período anterior."}</EstadoVazio>
        )}
      </Cartao>

      <Cartao titulo="Quem gerou atividade no Trello">
        <QuemGerou linhas={p.resumo.geracao} evolucao={(nome) => p.resumo.evolucaoGeracao[nome] ?? null} />
      </Cartao>

      <Cartao titulo="Entraram × resolvidas por semana">
        <GraficoSemanas semanas={p.semanas} />
      </Cartao>

      <Cartao titulo={`Cartões parados há ${DIAS_PARADA} dias ou mais (${p.parados.length})`}>
        {p.parados.length === 0 ? (
          <EstadoVazio>Nenhum cartão parado.</EstadoVazio>
        ) : (
          <ul className="divide-y divide-borda text-sm">
            {p.parados.slice(0, 10).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <Link href={`/tarefas/${c.id}`} className="block truncate hover:text-marca hover:underline">
                    {c.titulo}
                  </Link>
                  <span className="block truncate text-xs text-suave">{c.membros.join(", ") || SEM_RESPONSAVEL}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-suave">{c.dias} dias</span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao>
        <details>
          <summary className="cursor-pointer text-sm font-medium">Por lista</summary>
          <div className="mt-3">
            <Painel coluna="Lista" linhas={porLista} evolucao={evolucaoLista} destino={() => null} />
          </div>
        </details>
      </Cartao>

      <Cartao>
        <details>
          <summary className="cursor-pointer text-sm font-medium">Cartões e prazos</summary>
          <div className="mt-3">
            <Detalhes linhas={porResponsavel} />
          </div>
        </details>
      </Cartao>

      <Cartao>
        <details>
          <summary className="cursor-pointer text-sm font-medium">Como os números são calculados</summary>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-suave">
            <li>Tarefas resolvidas: cada item de checklist resolvido conta 1, e o cartão sem checklist concluído conta 1. Não importa em qual cartão ou lista. Cartão concluído resolve todos os seus itens.</li>
            <li>Tempo médio: da criação da tarefa até ela ser resolvida.</li>
            <li>Períodos do calendário: a semana vai de segunda a domingo e o mês é o do calendário. O período em andamento é parcial.</li>
            <li>Placar oficial: um dia depois de a semana ou o mês terminar, o placar é gravado e não muda mais, mesmo que alguém mexa no Trello depois. É ele que vale para a disputa e para o PDF.</li>
            <li>Item desmarcado e marcado de novo continua contando na data da primeira marcação.</li>
            <li>Evolução: tarefas resolvidas no período menos as do período anterior (o placar oficial dele, quando existe). Aparece — enquanto não há histórico.</li>
            <li>Entraram: tarefas criadas no período. Saldo: resolvidas menos entraram. Positivo mostra que a equipe está dando conta da demanda.</li>
            <li>Parados: cartões abertos, fora os de rotina, sem nenhuma movimentação no Trello. Comentário também conta como movimentação.</li>
            <li>A ordem é por tarefas resolvidas, sem posições. Cartão aberto é carga de trabalho, não falha.</li>
            <li>Atribuídas, Abertas e Concluídas: cartões de cada responsável, sem os de rotina.</li>
            <li>No prazo: cartões entregues até a primeira data de entrega, menos os atrasados, que incluem os vencidos em aberto. Positivo é bom, negativo pede atenção. Vale só para cartões com data e que não são de rotina, e adiar a data não melhora.</li>
            <li>Item resolvido conta para quem o marcou no Trello. Por isso, cada um deve marcar o que resolveu.</li>
            <li>Cartão sem checklist, e item sem registro de quem marcou, são divididos entre os responsáveis do cartão.</li>
            <li>Sem responsável aparece no fim da lista e fica fora dos totais e das listas.</li>
          </ul>
        </details>
      </Cartao>
    </div>
  );
}
