import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, EstadoVazio } from "@/components/ui";
import { QUADRO_EQUIPE, SEM_RESPONSAVEL, resumirEquipe, type ItemCartao, type LinhaEquipe } from "@/lib/equipe";
import { hojeSP, pct, somarDias } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Equipe" };

const PERIODOS = [
  { valor: "todos", rotulo: "Todo o período", dias: null },
  { valor: "90", rotulo: "Últimos 90 dias", dias: 90 },
  { valor: "30", rotulo: "Últimos 30 dias", dias: 30 },
];

const quantidade = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const saldo = (n: number | null) => (n === null ? "—" : n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
const corDoSaldo = (n: number | null) => (n === null || n === 0 ? "" : n > 0 ? "text-ok" : "text-alerta");
const dias = (d: number | null) => (d === null ? "—" : `${d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`);

const NUMERO = "py-2.5 text-right tabular-nums";
const CABECALHO = "py-2 text-right font-medium";

/** Painel sem posições: quanto cada um entregou, quanto carrega e se entrega no prazo. */
function Painel({ coluna, linhas, destino }: { coluna: string; linhas: LinhaEquipe[]; destino: (nome: string) => string | null }) {
  if (linhas.length === 0) return <EstadoVazio>Nenhuma tarefa neste período.</EstadoVazio>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-left text-xs text-suave">
          <tr>
            <th className="py-2 font-medium">{coluna}</th>
            <th className={CABECALHO}>Atribuídas</th>
            <th className={CABECALHO}>Abertas</th>
            <th className={CABECALHO}>Concluídas</th>
            <th className={CABECALHO}>Itens resolvidos</th>
            <th className={CABECALHO}>Entregas</th>
            <th className={CABECALHO}>Vencidas</th>
            <th className={CABECALHO}>No prazo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borda">
          {linhas.map((l) => {
            const semDono = l.nome === SEM_RESPONSAVEL;
            const link = destino(l.nome);
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
                <td className={NUMERO}>{l.atribuidas}</td>
                <td className={NUMERO}>{l.abertas}</td>
                <td className={NUMERO}>{l.concluidas}</td>
                <td className={NUMERO}>{quantidade(l.itensResolvidos)}</td>
                <td className={`${NUMERO} ${semDono ? "" : "font-semibold"}`}>{quantidade(l.resolvidas)}</td>
                <td className={`${NUMERO} ${l.vencidas > 0 ? "font-medium text-alerta" : ""}`}>{l.vencidas}</td>
                <td className={`${NUMERO} font-medium ${corDoSaldo(l.saldoPrazo)}`} title={l.cobraveis > 0 ? `${l.noPrazo} no prazo e ${l.cobraveis - l.noPrazo} atrasados` : "Sem cartões com prazo cobrável"}>
                  {saldo(l.saldoPrazo)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Prazos e tempos ficam à parte, para o ranking continuar simples. */
function Detalhes({ linhas }: { linhas: LinhaEquipe[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="text-left text-xs text-suave">
          <tr>
            <th className="py-2 font-medium">Responsável</th>
            <th className={CABECALHO}>Eficiência no prazo</th>
            <th className={CABECALHO}>Tempo médio</th>
            <th className={CABECALHO}>Tempo por item</th>
            <th className={CABECALHO}>Prazos alterados</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-borda">
          {linhas.map((l) => (
            <tr key={l.nome}>
              <td className="py-2 pr-3">{l.nome}</td>
              <td className="py-2 text-right tabular-nums">{l.cobraveis > 0 ? `${pct(l.eficiencia)} (${l.noPrazo} de ${l.cobraveis})` : "—"}</td>
              <td className="py-2 text-right tabular-nums">{dias(l.diasMedios)}</td>
              <td className="py-2 text-right tabular-nums">{dias(l.diasPorItem)}</td>
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
  const periodo = PERIODOS.find((p) => p.valor === bruto) ?? PERIODOS[0];
  const { supabase } = await exigirSessaoCompleta();
  const { data: membros } = await supabase.from("trello_membros").select("id, nome");
  const idMembro = new Map((membros ?? []).map((m) => [m.nome, m.id]));
  const { data } = await supabase
    .from("tarefas")
    .select("id, status, prazo, concluida_em, categoria, tarefa_membros(trello_membros(nome)), trello_cartao_datas(criado_em, concluido_em, prazo_original, prazo_alteracoes), cartoes_rotina(tarefa_id)")
    .eq("fonte", "trello")
    .like("categoria", `${QUADRO_EQUIPE} › %`);

  const hoje = hojeSP();
  const ids = (data ?? []).map((t) => t.id);
  const { data: itensChecklist } = ids.length
    ? await supabase.from("trello_checklist_itens").select("tarefa_id, concluido, criado_no_trello, concluido_em, atribuido:trello_membros!trello_checklist_itens_membro_id_fkey(nome), resolvedor:trello_membros!trello_checklist_itens_concluido_por_id_fkey(nome)").in("tarefa_id", ids).limit(5000)
    : { data: [] };
  const itensDoCartao = new Map<string, ItemCartao[]>();
  for (const i of itensChecklist ?? []) {
    const item = { concluido: i.concluido, criado_em: i.criado_no_trello, concluido_em: i.concluido_em, resolvido_por: i.resolvedor?.nome ?? null, responsaveis: i.atribuido ? [i.atribuido.nome] : [] };
    itensDoCartao.set(i.tarefa_id, [...(itensDoCartao.get(i.tarefa_id) ?? []), item]);
  }
  const cartoes = (data ?? []).map((t) => ({
    status: t.status,
    prazo: t.prazo,
    categoria: t.categoria,
    criado_em: t.trello_cartao_datas?.criado_em ?? null,
    prazo_original: t.trello_cartao_datas?.prazo_original ?? null,
    prazo_alteracoes: t.trello_cartao_datas?.prazo_alteracoes ?? 0,
    concluido_em: t.trello_cartao_datas?.concluido_em ?? t.concluida_em,
    membros: t.tarefa_membros.map((m) => m.trello_membros.nome),
    rotina: !!t.cartoes_rotina,
    itens: itensDoCartao.get(t.id),
  }));
  const { total, porLista, porResponsavel } = resumirEquipe(cartoes, hoje, periodo.dias ? somarDias(hoje, -periodo.dias) : undefined);

  const indicadores = [
    ["Entregas da equipe", quantidade(total?.resolvidas ?? 0)],
    ["Cartões abertos", total?.abertas ?? 0],
    ["No prazo", saldo(total?.saldoPrazo ?? null)],
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {indicadores.map(([rotulo, valor]) => (
          <Cartao key={rotulo}>
            <p className="text-xs text-suave">{rotulo}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{valor}</p>
          </Cartao>
        ))}
      </div>

      <Cartao titulo="Entregas da equipe">
        <Painel coluna="Responsável" linhas={porResponsavel} destino={(nome) => (idMembro.has(nome) ? `/tarefas?membro=${idMembro.get(nome)}` : null)} />
      </Cartao>

      <Cartao>
        <details>
          <summary className="cursor-pointer text-sm font-medium">Por lista</summary>
          <div className="mt-3">
            <Painel coluna="Lista" linhas={porLista} destino={() => null} />
          </div>
        </details>
      </Cartao>

      <Cartao>
        <details>
          <summary className="cursor-pointer text-sm font-medium">Prazos e tempos</summary>
          <div className="mt-3">
            <Detalhes linhas={porResponsavel} />
          </div>
        </details>
      </Cartao>

      <Cartao>
        <details>
          <summary className="cursor-pointer text-sm font-medium">Como os números são calculados</summary>
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-suave">
            <li>Atribuídas, Abertas e Concluídas: cartões de cada responsável, sem os de rotina.</li>
            <li>Entregas: cada item de checklist resolvido conta 1, e o cartão sem checklist concluído conta 1. Cartão concluído resolve todos os seus itens.</li>
            <li>A ordem é pelas entregas, sem posições. Cartão aberto é carga de trabalho, não falha.</li>
            <li>No prazo: cartões entregues até a primeira data de entrega, menos os atrasados, que incluem os vencidos em aberto. Positivo é bom, negativo pede atenção. Vale só para cartões com data e que não são de rotina, e adiar a data não melhora.</li>
            <li>Item resolvido conta para quem o marcou no Trello. Por isso, cada um deve marcar o que resolveu.</li>
            <li>Cartão sem checklist, e item sem registro de quem marcou, são divididos entre os responsáveis do cartão.</li>
            <li>Sem responsável aparece no fim da lista e fica fora dos totais e das listas.</li>
            <li>Nos períodos, o que está pendente sempre aparece.</li>
          </ul>
        </details>
      </Cartao>
    </div>
  );
}
