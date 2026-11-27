import Link from "next/link";
import { Cartao, Etiqueta } from "@/components/ui";
import { dataCivil } from "@/lib/formato";
import { AREAS, avaliarProntidao, datasDeReferencia, resumoPorArea, type Situacao } from "@/lib/prontidao";
import { carregarDadosProntidao, carregarGatilhos } from "@/lib/prontidao-dados";
import { exigirSessaoCompleta } from "@/lib/sessao";

const COR: Record<Situacao, { rotulo: string; tom: "alerta" | "atencao" | "ok" | "neutro" }> = {
  falta: { rotulo: "Falta", tom: "alerta" },
  vencido: { rotulo: "Desatualizado", tom: "neutro" },
  atencao: { rotulo: "Atenção", tom: "atencao" },
  ok: { rotulo: "Em dia", tom: "ok" },
};

/**
 * Sala de Situação (Doutrina do Centro de Comando): todas as obras numa tela, a pior situação de
 * cada área pela ficha de prontidão (RN-49r) e a data da informação mais recente ao lado.
 */
export async function SalaDeSituacao({ obras }: { obras: { id: string; codigo: string; situacao: string }[] }) {
  const { supabase } = await exigirSessaoCompleta();
  const g = await carregarGatilhos(supabase);
  const linhas = await Promise.all(
    obras.map(async (o) => {
      const dados = await carregarDadosProntidao(supabase, o.id).catch(() => null);
      return { ...o, resumo: dados ? resumoPorArea(avaliarProntidao(dados, g)) : null, datas: dados ? datasDeReferencia(dados) : null };
    }),
  );
  // Por exceção: quem tem falta sobe
  const peso = (l: (typeof linhas)[number]) => (l.resumo ? AREAS.filter((a) => l.resumo![a] === "falta").length * 10 + AREAS.filter((a) => l.resumo![a] === "vencido").length : -1);
  linhas.sort((a, b) => peso(b) - peso(a) || a.codigo.localeCompare(b.codigo));

  return (
    <Cartao titulo="Sala de Situação" className="overflow-x-auto">
      <p className="mb-3 text-xs text-suave">A cor é a pior situação de cada área pela ficha de prontidão da obra; a data é a da informação mais recente. Clique na obra para ver a ficha.</p>
      <table className="w-full min-w-[760px] text-sm">
        <thead className="text-left text-xs text-suave">
          <tr>
            <th className="py-2 pr-3 font-medium">Obra</th>
            {AREAS.map((a) => (
              <th key={a} className="py-2 pr-3 font-medium">
                {a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borda">
          {linhas.map((l) => (
            <tr key={l.id}>
              <td className="py-2.5 pr-3 font-medium">
                <Link href={`/obras/${l.id}#prontidao`} className="hover:text-marca hover:underline">
                  {l.codigo}
                </Link>
                {l.situacao !== "andamento" && <span className="block text-xs font-normal text-suave">{l.situacao}</span>}
              </td>
              {AREAS.map((a) => {
                const s = l.resumo?.[a] ?? null;
                const data = l.datas?.[a] ?? null;
                return (
                  <td key={a} className="py-2.5 pr-3 align-top">
                    {s ? <Etiqueta tom={COR[s].tom}>{COR[s].rotulo}</Etiqueta> : <span className="text-suave">—</span>}
                    {data && <span className="mt-0.5 block text-xs tabular-nums text-suave">{dataCivil(data)}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Cartao>
  );
}
