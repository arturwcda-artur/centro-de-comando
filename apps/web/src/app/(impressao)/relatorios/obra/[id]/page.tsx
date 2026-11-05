import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GraficoCurvaS } from "@/components/grafico-curva-s";
import { FolhaRelatorio, NumerosRelatorio, SecaoRelatorio } from "@/components/relatorio";
import { avisosContrato } from "@/lib/contratos";
import { diferencaEmDias } from "@/lib/curva-s";
import { SITUACOES_ADITIVO, SITUACOES_MEDICAO, TIPOS_ADITIVO } from "@/lib/dominio";
import { brl, dataCivil, dataHora, hojeSP, pct } from "@/lib/formato";
import { UUID } from "@/lib/obras";
import { carregarPlanejamentoObra } from "@/lib/planejamento";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Situação da obra" };

const rotulo = (lista: readonly { valor: string; rotulo: string }[], valor: string) => lista.find((x) => x.valor === valor)?.rotulo ?? valor;
const TABELA = "w-full text-xs";
const TITULO = "py-1 font-medium";

export default async function RelatorioObra({ params }: PageProps<"/relatorios/obra/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase } = await exigirSessaoCompleta();
  const p = await carregarPlanejamentoObra(supabase, id);
  if (!p) notFound();

  const hoje = hojeSP();
  const [resumos, riscos, tarefas] = await Promise.all([
    supabase.from("v_contratos_resumo").select("*").eq("obra_id", id),
    supabase.from("riscos").select("descricao, severidade, status").eq("obra_id", id).in("status", ["aberto", "em_tratamento"]).order("severidade", { ascending: false }).limit(5),
    supabase.from("v_tarefas_priorizadas").select("id, vencida").eq("obra_id", id),
  ]);
  const contratos = resumos.data ?? [];
  const ids = contratos.map((c) => c.contrato_id).filter((c): c is string => !!c);
  const [medicoes, aditivos, itens, arquivos] = ids.length
    ? await Promise.all([
        supabase.from("medicoes").select("id, numero, periodo_inicio, periodo_fim, valor_medido, situacao, diferenca_planilha").in("contrato_id", ids).order("numero"),
        supabase.from("aditivos").select("id, numero, tipo, valor_delta, dias_delta, situacao").in("contrato_id", ids).order("numero"),
        supabase.from("v_contrato_itens_saldo").select("valor_total, acima_do_contrato").in("contrato_id", ids),
        supabase.from("medicao_arquivos").select("ultima_leitura_em, ultimo_erro").in("contrato_id", ids),
      ])
    : [null, null, null, null];

  const c = contratos[0];
  const listaMedicoes = medicoes?.data ?? [];
  const listaItens = itens?.data ?? [];
  const leituraMedicao = arquivos?.data?.[0]?.ultima_leitura_em ?? null;
  const leituraCronograma = p.arquivoVigente?.ultima_leitura_em ?? null;
  const avisos = [
    ...p.avisos,
    ...(c
      ? avisosContrato({
          valorContratado: c.valor_contratado ?? 0,
          somaItens: listaItens.reduce((s, i) => s + (i.valor_total ?? 0), 0),
          itensAcima: listaItens.filter((i) => i.acima_do_contrato).length,
          diferencas: listaMedicoes.filter((m) => m.diferenca_planilha).map((m) => ({ numero: m.numero, diferenca: m.diferenca_planilha as number })),
          erroPlanilha: arquivos?.data?.[0]?.ultimo_erro ?? null,
          diasDesdeLeitura: null,
        })
      : []),
  ];
  const folga = p.limite && p.termino ? diferencaEmDias(p.termino, p.limite) : null;
  const diferenca = p.termino && p.terminoBase ? diferencaEmDias(p.terminoBase, p.termino) : null;
  const abertas = tarefas.data ?? [];

  return (
    <FolhaRelatorio
      titulo={`Situação da obra: ${p.obra.codigo}`}
      subtitulo={`Posição em ${dataCivil(hoje)}`}
      fonte={`MS Project, lido em ${dataHora(leituraCronograma)}; planilha de medição, lida em ${dataHora(leituraMedicao)}`}
      geradoEm={dataHora(new Date().toISOString())}
    >
      <SecaoRelatorio titulo="Prazo" vazia={!p.vigente}>
        <NumerosRelatorio
          itens={[
            ["Início", dataCivil(p.inicio)],
            ["Término previsto", dataCivil(p.termino)],
            ["Limite contratual", dataCivil(p.limite)],
            ["Folga", folga === null ? "—" : `${folga} dias`],
            ["Linha de base", diferenca === null ? "—" : `${Math.abs(diferenca)} dias ${diferenca > 0 ? "depois" : "antes"}`],
            ["Avanço", pct(p.avanco)],
          ]}
        />
      </SecaoRelatorio>

      <SecaoRelatorio titulo="Curva S (R$ acumulados)" vazia={!p.vigente}>
        <GraficoCurvaS series={p.series} />
      </SecaoRelatorio>

      <SecaoRelatorio titulo="Contrato" vazia={!c}>
        {c && (
          <NumerosRelatorio
            itens={[
              ["Contratado", brl(c.valor_contratado)],
              ["Medido", brl(c.valor_medido)],
              ["Saldo a medir", brl(c.saldo_a_medir)],
              ["Faturado", brl(c.valor_faturado)],
              ["Recebido", brl(c.valor_recebido)],
              ["Término vigente", dataCivil(c.data_termino_vigente)],
            ]}
          />
        )}
      </SecaoRelatorio>

      <SecaoRelatorio titulo="Medições" vazia={listaMedicoes.length === 0}>
        <table className={TABELA}>
          <thead className="text-left text-suave">
            <tr>
              <th className={TITULO}>Número</th>
              <th className={TITULO}>Período</th>
              <th className={`${TITULO} text-right`}>Valor</th>
              <th className={`${TITULO} text-right`}>Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">
            {listaMedicoes.map((m) => (
              <tr key={m.id}>
                <td className="py-1">{m.numero}</td>
                <td className="py-1 tabular-nums">
                  {dataCivil(m.periodo_inicio)} a {dataCivil(m.periodo_fim)}
                </td>
                <td className="py-1 text-right tabular-nums">{brl(m.valor_medido)}</td>
                <td className="py-1 text-right">{rotulo(SITUACOES_MEDICAO, m.situacao)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SecaoRelatorio>

      <SecaoRelatorio titulo="Aditivos" vazia={(aditivos?.data ?? []).length === 0}>
        <ul className="space-y-0.5 text-xs">
          {(aditivos?.data ?? []).map((a) => (
            <li key={a.id} className="flex justify-between gap-3">
              <span>
                Aditivo {a.numero} · {rotulo(TIPOS_ADITIVO, a.tipo)}
              </span>
              <span className="tabular-nums">
                {brl(a.valor_delta)} · {a.dias_delta} dias · {rotulo(SITUACOES_ADITIVO, a.situacao)}
              </span>
            </li>
          ))}
        </ul>
      </SecaoRelatorio>

      <SecaoRelatorio titulo="Riscos abertos" vazia={(riscos.data ?? []).length === 0}>
        <ul className="space-y-0.5 text-xs">
          {(riscos.data ?? []).map((r) => (
            <li key={r.descricao} className="flex justify-between gap-3">
              <span>{r.descricao}</span>
              <span className="shrink-0 tabular-nums text-suave">Severidade {r.severidade}</span>
            </li>
          ))}
        </ul>
      </SecaoRelatorio>

      <SecaoRelatorio titulo="Tarefas da obra" vazia={abertas.length === 0}>
        <p className="text-xs">
          {abertas.length} abertas, {abertas.filter((t) => t.vencida).length} vencidas.
        </p>
      </SecaoRelatorio>

      {avisos.length > 0 && (
        <SecaoRelatorio titulo="Avisos">
          <ul className="list-disc space-y-0.5 pl-4 text-xs">
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </SecaoRelatorio>
      )}
    </FolhaRelatorio>
  );
}
