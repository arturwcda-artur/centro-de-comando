import type { Metadata } from "next";
import Link from "next/link";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { dataCivil } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Decisões no planejamento" };

/** Decisões com a ressalva de que afetam o planejamento, para o cérebro avaliar (RN-49n). */
export default async function PaginaDecisoes() {
  const { supabase } = await exigirSessaoCompleta();
  const [decisoes, avaliacoes] = await Promise.all([
    supabase.from("decisoes").select("id, problema, decisao, data_decisao, obras(codigo)").eq("afeta_planejamento", true).order("data_decisao", { ascending: false }).limit(200),
    supabase.from("avaliacoes_planejamento").select("decisao_id, situacao, variacao_uteis"),
  ]);
  const porDecisao = new Map((avaliacoes.data ?? []).map((a) => [a.decisao_id, a]));
  const lista = decisoes.data ?? [];
  const pendentes = lista.filter((d) => !porDecisao.has(d.id));
  const avaliadas = lista.filter((d) => porDecisao.has(d.id));

  const Linha = ({ d }: { d: (typeof lista)[number] }) => {
    const a = porDecisao.get(d.id);
    return (
      <li className="flex items-start justify-between gap-3 py-2.5">
        <Link href={`/planejamento/decisoes/${d.id}`} className="min-w-0 hover:text-marca">
          <span className="block truncate text-sm font-medium">{d.decisao}</span>
          <span className="block truncate text-xs text-suave">
            {d.obras?.codigo ?? "sem obra"} · {dataCivil(d.data_decisao)} · {d.problema}
          </span>
        </Link>
        {!a ? (
          <Etiqueta tom="atencao">Avaliar</Etiqueta>
        ) : a.situacao === "nao_alterar" ? (
          <Etiqueta>Não altera</Etiqueta>
        ) : (
          <Etiqueta tom={(a.variacao_uteis ?? 0) > 0 ? "alerta" : "ok"}>{a.variacao_uteis ? `${a.variacao_uteis > 0 ? "+" : ""}${a.variacao_uteis} d úteis` : "Término mantido"}</Etiqueta>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/planejamento" className="text-sm text-suave hover:text-texto">
          ← Planejamento
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Decisões no planejamento</h1>
        <p className="text-sm text-suave">
          Decisões marcadas com a ressalva &quot;afeta o planejamento da obra&quot;. O sistema calcula o efeito no cronograma vigente e a rota de alteração; você decide se altera. O arquivo do Project nunca é alterado aqui.
        </p>
      </div>
      <Cartao titulo={`Aguardando avaliação (${pendentes.length})`}>
        {pendentes.length ? (
          <ul className="divide-y divide-borda">
            {pendentes.map((d) => (
              <Linha key={d.id} d={d} />
            ))}
          </ul>
        ) : (
          <EstadoVazio>Nenhuma decisão aguardando. Elas surgem ao concluir uma tarefa marcando &quot;Afeta o planejamento da obra&quot;.</EstadoVazio>
        )}
      </Cartao>
      {avaliadas.length > 0 && (
        <Cartao titulo={`Avaliadas (${avaliadas.length})`}>
          <ul className="divide-y divide-borda">
            {avaliadas.map((d) => (
              <Linha key={d.id} d={d} />
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  );
}
