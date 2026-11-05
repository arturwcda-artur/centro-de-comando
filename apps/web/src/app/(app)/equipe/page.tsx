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

function Tabela({ titulo, coluna, linhas }: { titulo: string; coluna: string; linhas: LinhaEquipe[] }) {
  return (
    <Cartao titulo={titulo}>
      {linhas.length === 0 ? (
        <EstadoVazio>Nenhum cartão neste período.</EstadoVazio>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-suave">
              <tr>
                <th className="py-2 font-medium">{coluna}</th>
                <th className="py-2 text-right font-medium">Atribuídas</th>
                <th className="py-2 text-right font-medium">Abertas</th>
                <th className="py-2 text-right font-medium">Concluídas</th>
                <th className="py-2 text-right font-medium">Vencidas</th>
                <th className="py-2 text-right font-medium">% concluída</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {linhas.map((l) => (
                <tr key={l.nome}>
                  <td className="py-2 pr-3">{l.nome}</td>
                  <td className="py-2 text-right tabular-nums">{l.atribuidas}</td>
                  <td className="py-2 text-right tabular-nums">{l.abertas}</td>
                  <td className="py-2 text-right tabular-nums">{l.concluidas}</td>
                  <td className={`py-2 text-right tabular-nums ${l.vencidas > 0 ? "font-medium text-alerta" : ""}`}>{l.vencidas}</td>
                  <td className="py-2 text-right tabular-nums">{pct(l.percentual)}</td>
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
  const { data } = await supabase
    .from("tarefas")
    .select("status, prazo, concluida_em, categoria, tarefa_membros(trello_membros(nome))")
    .eq("fonte", "trello")
    .like("categoria", `${QUADRO_EQUIPE} › %`);

  const hoje = hojeSP();
  const cartoes = (data ?? []).map((t) => ({ ...t, membros: t.tarefa_membros.map((m) => m.trello_membros.nome) }));
  const { total, porLista, porResponsavel } = resumirEquipe(cartoes, hoje, periodo.dias ? somarDias(hoje, -periodo.dias) : undefined);

  const indicadores = [
    ["Cartões", total?.atribuidas ?? 0],
    ["Abertos", total?.abertas ?? 0],
    ["Concluídos", total?.concluidas ?? 0],
    ["Vencidos", total?.vencidas ?? 0],
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map(([rotulo, valor]) => (
          <Cartao key={rotulo}>
            <p className="text-xs text-suave">{rotulo}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{valor}</p>
          </Cartao>
        ))}
      </div>

      <Tabela titulo="Por responsável" coluna="Responsável" linhas={porResponsavel} />
      <Tabela titulo="Por lista" coluna="Lista" linhas={porLista} />

      <p className="text-xs text-suave">
        Cartão com dois membros conta para os dois. A conclusão conta para quem estava atribuído, e a data é a da última atividade do cartão. Nos períodos, os cartões abertos sempre aparecem.
      </p>
    </div>
  );
}
