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
        <EstadoVazio>Nenhum cartão neste período.</EstadoVazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-suave">
              <tr>
                <th className="py-2 pr-2 font-medium">#</th>
                <th className="py-2 font-medium">{coluna}</th>
                <th className="py-2 text-right font-medium">Atribuídas</th>
                <th className="py-2 text-right font-medium">Abertas</th>
                <th className="py-2 text-right font-medium">Concluídas</th>
                <th className="py-2 text-right font-medium">Vencidas</th>
                <th className="py-2 text-right font-medium">Eficiência</th>
                <th className="py-2 text-right font-medium">Tempo médio</th>
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
                  <td className="py-2 text-right tabular-nums">{l.atribuidas}</td>
                  <td className="py-2 text-right tabular-nums">{l.abertas}</td>
                  <td className="py-2 text-right tabular-nums">{l.concluidas}</td>
                  <td className={`py-2 text-right tabular-nums ${l.vencidas > 0 ? "font-medium text-alerta" : ""}`}>{l.vencidas}</td>
                  <td className="py-2 text-right tabular-nums">
                    {pct(l.eficiencia)}
                    {l.cobraveis > 0 && <span className="block text-xs text-suave">{`${l.noPrazo} de ${l.cobraveis}`}</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{dias(l.diasMedios)}</td>
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
    .select("status, prazo, concluida_em, categoria, tarefa_membros(trello_membros(nome)), trello_cartao_datas(criado_em, concluido_em, prazo_original, prazo_alteracoes)")
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
  }));
  const { total, porLista, porResponsavel } = resumirEquipe(cartoes, hoje, periodo.dias ? somarDias(hoje, -periodo.dias) : undefined);

  const indicadores = [
    ["Cartões", total?.atribuidas ?? 0],
    ["Abertos", total?.abertas ?? 0],
    ["Concluídos", total?.concluidas ?? 0],
    ["Vencidos", total?.vencidas ?? 0],
    ["Eficiência", pct(total?.eficiencia)],
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
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
        Eficiência: cartões concluídos até a primeira data de entrega, divididos pelos concluídos com prazo mais os vencidos em aberto. Adiar a data não melhora a taxa. O ranking vai da maior para a menor eficiência e muda conforme o período escolhido. Tempo médio: da criação à conclusão, em todos os concluídos. Cartão com dois membros conta para os dois, e a conclusão conta para quem estava atribuído. Nos períodos, os cartões abertos sempre aparecem.
      </p>
    </div>
  );
}
