import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { avisosContrato } from "@/lib/contratos";
import { diferencaEmDias } from "@/lib/curva-s";
import { SITUACOES_ADITIVO, SITUACOES_MEDICAO, TIPOS_ADITIVO, TIPOS_LANCAMENTO } from "@/lib/dominio";
import { brl, dataCivil, dataHora, hojeSP } from "@/lib/formato";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { salvarAditivo, salvarLancamento, salvarSituacaoMedicao } from "../acoes";
import { FormularioAditivo, FormularioLancamento, FormularioMedicao } from "./formularios";

export const metadata: Metadata = { title: "Contrato" };

const rotulo = (lista: readonly { valor: string; rotulo: string }[], valor: string) => lista.find((x) => x.valor === valor)?.rotulo ?? valor;
const TOM_MEDICAO: Record<string, "ok" | "atencao" | "neutro" | "alerta"> = { aprovada: "ok", glosada: "atencao", enviada: "atencao", cancelada: "alerta", elaborada: "neutro" };
const quantidade = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function Valor({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe?: string }) {
  return (
    <Cartao>
      <p className="text-xs text-suave">{titulo}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{valor}</p>
      {detalhe && <p className="text-xs text-suave">{detalhe}</p>}
    </Cartao>
  );
}

export default async function PaginaContrato({ params, searchParams }: PageProps<"/contratos/[id]">) {
  const { id } = await params;
  const { busca: buscaBruta, filtro: filtroBruto } = await searchParams;
  const busca = typeof buscaBruta === "string" ? buscaBruta.trim().toLowerCase() : "";
  const filtro = typeof filtroBruto === "string" ? filtroBruto : "medidos";
  if (!UUID.test(id)) notFound();

  const { supabase } = await exigirSessaoCompleta();
  const [contrato, resumo, aditivos, medicoes, lancamentos, itens, arquivo] = await Promise.all([
    supabase.from("contratos").select("*, obras(codigo)").eq("id", id).maybeSingle(),
    supabase.from("v_contratos_resumo").select("*").eq("contrato_id", id).maybeSingle(),
    supabase.from("aditivos").select("*").eq("contrato_id", id).order("numero"),
    supabase.from("medicoes").select("*").eq("contrato_id", id).order("numero"),
    supabase.from("lancamentos_financeiros").select("*").eq("contrato_id", id).order("criado_em", { ascending: false }),
    supabase.from("v_contrato_itens_saldo").select("*").eq("contrato_id", id),
    supabase.from("medicao_arquivos").select("*").eq("contrato_id", id).maybeSingle(),
  ]);
  if (!contrato.data || !resumo.data) notFound();

  const r = resumo.data;
  const listaItens = (itens.data ?? []).sort((a, b) => Number(a.item) - Number(b.item));
  const listaMedicoes = medicoes.data ?? [];
  const avisos = avisosContrato({
    valorContratado: r.valor_contratado ?? 0,
    somaItens: listaItens.reduce((s, i) => s + (i.valor_total ?? 0), 0),
    itensAcima: listaItens.filter((i) => i.acima_do_contrato).length,
    diferencas: listaMedicoes.filter((m) => m.diferenca_planilha).map((m) => ({ numero: m.numero, diferenca: m.diferenca_planilha as number })),
    erroPlanilha: arquivo.data?.ultimo_erro ?? null,
    diasDesdeLeitura: arquivo.data?.ultima_leitura_em ? diferencaEmDias(arquivo.data.ultima_leitura_em.slice(0, 10), hojeSP()) : null,
  });

  const visiveis = listaItens.filter((i) => {
    if (busca && !`${i.item} ${i.descricao}`.toLowerCase().includes(busca)) return false;
    if (filtro === "acima") return i.acima_do_contrato;
    if (filtro === "medidos") return (i.quantidade_medida ?? 0) !== 0;
    return true;
  });
  const filtros = [
    { valor: "medidos", rotulo: "Com medição" },
    { valor: "acima", rotulo: "Acima do contrato" },
    { valor: "todos", rotulo: "Todos" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/contratos" className="text-sm text-suave hover:text-texto">
            ← Contratos
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{contrato.data.obras?.codigo}</h1>
          <p className="text-sm text-suave">Contrato {contrato.data.numero}</p>
        </div>
        <Link href={`/contratos/${id}/editar`} className="inline-flex h-10 items-center rounded-lg border border-borda bg-superficie px-3 text-sm font-medium hover:bg-superficie-2">
          Editar contrato
        </Link>
      </div>

      {avisos.map((a) => (
        <Aviso key={a} tipo="info">
          {a}
        </Aviso>
      ))}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Valor titulo="Contratado" valor={brl(r.valor_contratado)} detalhe={`Original ${brl(r.valor_original)}`} />
        <Valor titulo="Medido" valor={brl(r.valor_medido)} detalhe="Só medições aprovadas" />
        <Valor titulo="Saldo a medir" valor={brl(r.saldo_a_medir)} />
        <Valor titulo="Faturado" valor={brl(r.valor_faturado)} />
        <Valor titulo="Recebido" valor={brl(r.valor_recebido)} />
        <Valor titulo="Saldo a receber" valor={brl(r.saldo_a_receber)} detalhe={`Término vigente: ${dataCivil(r.data_termino_vigente)}`} />
      </div>

      <Cartao titulo="Medições">
        {listaMedicoes.length === 0 ? (
          <EstadoVazio>{arquivo.data ? "Nenhuma medição lida ainda. Rode o atalho Atualizar cronogramas." : "Informe a planilha de medição em Editar contrato."}</EstadoVazio>
        ) : (
          <ul className="space-y-3">
            {listaMedicoes.map((m) => (
              <li key={m.id} className="rounded-lg border border-borda p-3">
                <details>
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-medium">Medição {m.numero}</span>
                    <span className="text-xs text-suave">
                      {dataCivil(m.periodo_inicio)} a {dataCivil(m.periodo_fim)}
                    </span>
                    <span className="tabular-nums">{brl(m.valor_medido)}</span>
                    <Etiqueta tom={TOM_MEDICAO[m.situacao] ?? "neutro"}>{rotulo(SITUACOES_MEDICAO, m.situacao)}</Etiqueta>
                  </summary>
                  <div className="mt-3">
                    <FormularioMedicao acao={salvarSituacaoMedicao.bind(null, m.id, id)} medicao={m} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      {listaItens.length > 0 && (
        <Cartao titulo="Saldo por serviço">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {filtros.map((f) => (
              <Link
                key={f.valor}
                href={`/contratos/${id}?filtro=${f.valor}`}
                aria-current={filtro === f.valor ? "page" : undefined}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${filtro === f.valor ? "border-marca bg-marca-suave" : "border-borda hover:bg-superficie-2"}`}
              >
                {f.rotulo}
              </Link>
            ))}
            <form className="ml-auto flex gap-2">
              <input type="hidden" name="filtro" value="todos" />
              <input name="busca" defaultValue={busca} aria-label="Buscar serviço" placeholder="Buscar serviço" className="h-8 rounded-lg border border-borda bg-superficie-2 px-2 text-xs" />
            </form>
          </div>
          {visiveis.length === 0 ? (
            <EstadoVazio>Nenhum serviço neste filtro.</EstadoVazio>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs text-suave">
                  <tr>
                    <th className="py-2 font-medium">Item</th>
                    <th className="py-2 font-medium">Serviço</th>
                    <th className="py-2 text-right font-medium">Contrato</th>
                    <th className="py-2 text-right font-medium">Medido</th>
                    <th className="py-2 text-right font-medium">Saldo</th>
                    <th className="py-2 text-right font-medium">Saldo (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borda">
                  {visiveis.map((i) => (
                    <tr key={i.item_id}>
                      <td className="py-2 pr-2 tabular-nums">{i.item}</td>
                      <td className="max-w-sm py-2 pr-3">
                        {i.descricao} {i.acima_do_contrato && <Etiqueta tom="alerta">Acima</Etiqueta>}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {quantidade.format(i.quantidade ?? 0)} {i.unidade}
                      </td>
                      <td className="py-2 text-right tabular-nums">{quantidade.format(i.quantidade_medida ?? 0)}</td>
                      <td className="py-2 text-right tabular-nums">{quantidade.format(i.quantidade_saldo ?? 0)}</td>
                      <td className="py-2 text-right tabular-nums">{brl(i.valor_saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Cartao>
      )}

      <Cartao titulo="Aditivos">
        {(aditivos.data ?? []).length > 0 && (
          <ul className="mb-4 space-y-2 text-sm">
            {(aditivos.data ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Aditivo {a.numero} · {rotulo(TIPOS_ADITIVO, a.tipo)}
                </span>
                <span className="flex items-center gap-2 text-xs">
                  <span className="tabular-nums">
                    {brl(a.valor_delta)} · {a.dias_delta} dias
                  </span>
                  <Etiqueta tom={a.situacao === "aprovado" ? "ok" : a.situacao === "rejeitado" ? "alerta" : "atencao"}>{rotulo(SITUACOES_ADITIVO, a.situacao)}</Etiqueta>
                </span>
              </li>
            ))}
          </ul>
        )}
        <details>
          <summary className="cursor-pointer text-sm font-medium text-marca">Cadastrar ou atualizar aditivo</summary>
          <div className="mt-3">
            <FormularioAditivo acao={salvarAditivo.bind(null, id)} />
          </div>
        </details>
      </Cartao>

      <Cartao titulo="Lançamentos financeiros">
        {(lancamentos.data ?? []).length > 0 && (
          <ul className="mb-4 space-y-2 text-sm">
            {(lancamentos.data ?? []).map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {rotulo(TIPOS_LANCAMENTO, l.tipo)}
                  {l.nota_fiscal ? ` · NF ${l.nota_fiscal}` : ""}
                </span>
                <span className="text-xs tabular-nums">
                  {brl(l.valor)} · {l.data_efetiva ? dataCivil(l.data_efetiva) : `previsto ${dataCivil(l.data_prevista)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        <details>
          <summary className="cursor-pointer text-sm font-medium text-marca">Novo lançamento</summary>
          <div className="mt-3">
            <FormularioLancamento acao={salvarLancamento.bind(null, id)} medicoes={listaMedicoes.map((m) => ({ valor: m.id, rotulo: `Medição ${m.numero}` }))} />
          </div>
        </details>
      </Cartao>

      {arquivo.data && (
        <Cartao titulo="Planilha de medição">
          <p className="break-all text-xs">{arquivo.data.caminho}</p>
          <p className="mt-1 text-xs text-suave">Última leitura: {dataHora(arquivo.data.ultima_leitura_em)}</p>
        </Cartao>
      )}
    </div>
  );
}
