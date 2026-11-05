import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, EstadoVazio } from "@/components/ui";
import { GraficoSemanas } from "@/components/grafico-semanas";
import { DIAS_PARADA, QUADRO_EQUIPE, SEM_RESPONSAVEL, type LinhaEquipe } from "@/lib/equipe";
import { PERIODOS, carregarCartoesEquipe, montarPainelEquipe, periodoDe } from "@/lib/equipe-dados";
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

export default async function PaginaEquipe({ searchParams }: PageProps<"/equipe">) {
  const { periodo: bruto } = await searchParams;
  const periodo = periodoDe(bruto);
  const { supabase } = await exigirSessaoCompleta();
  const { cartoes, idMembro } = await carregarCartoesEquipe(supabase);
  const { total, porLista, porResponsavel, entraram, saldo: saldoDoPeriodo, evolucaoEquipe, evolucaoPessoa, evolucaoLista, parados, semanas } = montarPainelEquipe(cartoes, periodo.dias);

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
        <p className="text-sm text-suave">Quadro {QUADRO_EQUIPE}, conforme a última sincronização do Trello.</p>
      </div>

      <nav aria-label="Período" className="flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <Link
            key={p.valor}
            href={`/equipe?periodo=${p.valor}`}
            aria-current={p.valor === periodo.valor ? "page" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${p.valor === periodo.valor ? "border-marca bg-marca-suave" : "border-borda hover:bg-superficie-2"}`}
          >
            {p.rotulo}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {indicadores.map(([rotulo, valor, cor]) => (
          <Cartao key={rotulo}>
            <p className="text-xs text-suave">{rotulo}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${cor}`}>{valor}</p>
          </Cartao>
        ))}
      </div>

      <Cartao titulo="Quem resolveu">
        <Painel coluna="Responsável" linhas={porResponsavel} evolucao={evolucaoPessoa} destino={(nome) => (idMembro.has(nome) ? `/tarefas?membro=${idMembro.get(nome)}` : null)} />
      </Cartao>

      <Cartao titulo="Entraram × resolvidas por semana">
        <GraficoSemanas semanas={semanas} />
      </Cartao>

      <Cartao titulo={`Cartões parados há ${DIAS_PARADA} dias ou mais (${parados.length})`}>
        {parados.length === 0 ? (
          <EstadoVazio>Nenhum cartão parado.</EstadoVazio>
        ) : (
          <ul className="divide-y divide-borda text-sm">
            {parados.slice(0, 10).map((c) => (
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
            <li>Evolução: tarefas resolvidas no período menos as do período anterior, de mesmo tamanho. Aparece — enquanto não há histórico.</li>
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
