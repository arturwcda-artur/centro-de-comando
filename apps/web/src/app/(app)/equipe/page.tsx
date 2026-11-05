import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, EstadoVazio } from "@/components/ui";
import { QUADRO_EQUIPE, resumirEquipe, type LinhaEquipe } from "@/lib/equipe";
import { hojeSP, pct, somarDias } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Equipe" };

const PERIODOS = [
  { valor: "todos", rotulo: "Todo o período", dias: null },
  { valor: "90", rotulo: "Últimos 90 dias", dias: 90 },
  { valor: "30", rotulo: "Últimos 30 dias", dias: 30 },
];

const dias = (d: number | null) => (d === null ? "—" : `${d.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`);

function Tabela({ titulo, coluna, linhas, destino }: { titulo: string; coluna: string; linhas: LinhaEquipe[]; destino: (nome: string) => string | null }) {
  return (
    <Cartao titulo={titulo}>
      {linhas.length === 0 ? (
        <EstadoVazio>Nenhuma tarefa neste período.</EstadoVazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="text-left text-xs text-suave">
              <tr>
                <th className="py-2 pr-2 font-medium">#</th>
                <th className="py-2 font-medium">{coluna}</th>
                <th className="py-2 text-right font-medium">Sob responsabilidade</th>
                <th className="py-2 text-right font-medium">Resolvidas</th>
                <th className="py-2 text-right font-medium">Pendentes</th>
                <th className="py-2 text-right font-medium">Resolução</th>
                <th className="py-2 text-right font-medium">Eficiência no prazo</th>
                <th className="py-2 text-right font-medium">Vencidas</th>
                <th className="py-2 text-right font-medium">Tempo médio</th>
                <th className="py-2 text-right font-medium">Tempo por item</th>
                <th className="py-2 text-right font-medium">Prazos alterados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {linhas.map((l) => (
                <tr key={l.nome}>
                  <td className="py-2 pr-2 tabular-nums text-suave">{l.posicao ?? "—"}</td>
                  <td className="py-2 pr-3">
                    {destino(l.nome) ? (
                      <Link href={destino(l.nome) as string} className="hover:text-marca hover:underline">
                        {l.nome}
                      </Link>
                    ) : (
                      l.nome
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">{l.sobResponsabilidade}</td>
                  <td className="py-2 text-right tabular-nums">
                    {l.resolvidas}
                    {l.itensRotina > 0 && <span className="block text-xs text-suave">{`${l.itensRotina} de rotina`}</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{l.pendentes}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{pct(l.resolucao)}</td>
                  <td className="py-2 text-right tabular-nums">
                    {pct(l.eficiencia)}
                    {l.cobraveis > 0 && <span className="block text-xs text-suave">{`${l.noPrazo} de ${l.cobraveis}`}</span>}
                  </td>
                  <td className={`py-2 text-right tabular-nums ${l.vencidas > 0 ? "font-medium text-alerta" : ""}`}>{l.vencidas}</td>
                  <td className="py-2 text-right tabular-nums">{dias(l.diasMedios)}</td>
                  <td className="py-2 text-right tabular-nums">{dias(l.diasPorItem)}</td>
                  <td className="py-2 text-right tabular-nums">{l.prazosAlterados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Cartao>
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
    id: t.id,
  }));
  const rotinas = new Map(cartoes.filter((c) => c.rotina).map((c) => [c.id, c]));
  const { data: itensRotina } = rotinas.size
    ? await supabase.from("trello_checklist_itens").select("tarefa_id, concluido, criado_no_trello, concluido_em, trello_membros(nome)").in("tarefa_id", [...rotinas.keys()])
    : { data: [] };
  const itens = (itensRotina ?? []).map((i) => {
    const cartao = rotinas.get(i.tarefa_id);
    return { concluido: i.concluido, criado_em: i.criado_no_trello, concluido_em: i.concluido_em, categoria: cartao?.categoria ?? null, responsaveis: i.trello_membros ? [i.trello_membros.nome] : (cartao?.membros ?? []) };
  });
  const { total, porLista, porResponsavel } = resumirEquipe(cartoes, hoje, periodo.dias ? somarDias(hoje, -periodo.dias) : undefined, itens);

  const indicadores = [
    ["Sob responsabilidade", total?.sobResponsabilidade ?? 0],
    ["Resolvidas", total?.resolvidas ?? 0],
    ["Pendentes", total?.pendentes ?? 0],
    ["Resolução", pct(total?.resolucao)],
    ["Eficiência no prazo", pct(total?.eficiencia)],
    ["Vencidos", total?.vencidas ?? 0],
    ["Tempo médio", dias(total?.diasMedios ?? null)],
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {indicadores.map(([rotulo, valor]) => (
          <Cartao key={rotulo}>
            <p className="text-xs text-suave">{rotulo}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{valor}</p>
          </Cartao>
        ))}
      </div>

      <Tabela titulo="Ranking por responsável" coluna="Responsável" linhas={porResponsavel} destino={(nome) => (idMembro.has(nome) ? `/tarefas?membro=${idMembro.get(nome)}` : null)} />
      <Tabela titulo="Ranking por lista" coluna="Lista" linhas={porLista} destino={() => null} />

      <p className="text-xs text-suave">
        Sob responsabilidade: cartões mais itens de cartões de rotina. Resolução: resolvidas divididas pelo que está sob responsabilidade, e define o ranking. Um item conta igual a um cartão. Eficiência no prazo: só cartões com data, concluídos até a primeira data de entrega, divididos pelos concluídos com prazo mais os vencidos em aberto. Adiar a data não melhora essa taxa. Tempo médio: da criação à conclusão do cartão. Cartão com dois membros conta para os dois. Nos períodos, o que está pendente sempre aparece.
      </p>
    </div>
  );
}
