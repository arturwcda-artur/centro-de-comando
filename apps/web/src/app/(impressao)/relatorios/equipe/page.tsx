import type { Metadata } from "next";
import { GraficoSemanas } from "@/components/grafico-semanas";
import { FolhaRelatorio, NumerosRelatorio, SecaoRelatorio } from "@/components/relatorio";
import { QUADRO_EQUIPE, SEM_RESPONSAVEL } from "@/lib/equipe";
import { carregarCartoesEquipe, montarPainelEquipe, periodoDe } from "@/lib/equipe-dados";
import { dataHora } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "KPI da equipe" };

const quantidade = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const comSinal = (n: number | null) => (n === null ? "—" : n > 0 ? `+${quantidade(n)}` : n < 0 ? `−${quantidade(Math.abs(n))}` : "0");
const dias = (d: number | null) => (d === null ? "—" : `${quantidade(d)} dias`);

export default async function RelatorioEquipe({ searchParams }: PageProps<"/relatorios/equipe">) {
  const periodo = periodoDe((await searchParams).periodo);
  const { supabase } = await exigirSessaoCompleta();
  const { cartoes, ultimaSync } = await carregarCartoesEquipe(supabase);
  const p = montarPainelEquipe(cartoes, periodo.dias);

  return (
    <FolhaRelatorio titulo="KPI da equipe" subtitulo={`${QUADRO_EQUIPE} · ${periodo.rotulo}`} fonte={`Trello, sincronizado em ${dataHora(ultimaSync)}`} geradoEm={dataHora(new Date().toISOString())}>
      <NumerosRelatorio
        itens={[
          ["Tarefas resolvidas", quantidade(p.total?.resolvidas ?? 0)],
          ["Entraram", quantidade(p.entraram)],
          ["Saldo", comSinal(p.saldo)],
          ["Tempo médio", dias(p.total?.diasPorTarefa ?? null)],
          ["Evolução", comSinal(p.evolucaoEquipe)],
          ["Cartões parados", String(p.parados.length)],
        ]}
      />

      <SecaoRelatorio titulo="Quem resolveu" vazia={p.porResponsavel.length === 0}>
        <table className="w-full text-xs">
          <thead className="text-left text-suave">
            <tr>
              <th className="py-1 font-medium">Responsável</th>
              <th className="py-1 text-right font-medium">Tarefas resolvidas</th>
              <th className="py-1 text-right font-medium">Tempo médio</th>
              <th className="py-1 text-right font-medium">Evolução</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">
            {p.porResponsavel.map((l) => (
              <tr key={l.nome} className={l.nome === SEM_RESPONSAVEL ? "text-suave" : undefined}>
                <td className="py-1">{l.nome}</td>
                <td className="py-1 text-right font-semibold tabular-nums">{quantidade(l.resolvidas)}</td>
                <td className="py-1 text-right tabular-nums">{dias(l.diasPorTarefa)}</td>
                <td className="py-1 text-right tabular-nums">{comSinal(p.evolucaoPessoa(l.nome, l.resolvidas))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SecaoRelatorio>

      <SecaoRelatorio titulo="Entraram × resolvidas por semana">
        <GraficoSemanas semanas={p.semanas} />
      </SecaoRelatorio>

      <SecaoRelatorio titulo="Cartões parados há 14 dias ou mais" vazia={p.parados.length === 0}>
        <ul className="space-y-0.5 text-xs">
          {p.parados.slice(0, 5).map((c) => (
            <li key={c.id} className="flex justify-between gap-3">
              <span className="truncate">
                {c.titulo} · {c.membros.join(", ") || SEM_RESPONSAVEL}
              </span>
              <span className="shrink-0 tabular-nums text-suave">{c.dias} dias</span>
            </li>
          ))}
        </ul>
      </SecaoRelatorio>
    </FolhaRelatorio>
  );
}
