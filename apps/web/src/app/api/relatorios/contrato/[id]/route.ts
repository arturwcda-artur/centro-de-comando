import { NextResponse, type NextRequest } from "next/server";
import { avisosContrato } from "@/lib/contratos";
import { dataHora } from "@/lib/formato";
import { UUID } from "@/lib/obras";
import { montarPlanilhaContrato } from "@/lib/relatorio-excel";
import { exigirSessaoCompleta } from "@/lib/sessao";

/** Excel de medições e contrato, gerado na hora. Nada fica guardado. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse("Contrato inválido", { status: 404 });
  const { supabase } = await exigirSessaoCompleta();

  const [contrato, resumo, medicoes, itens, aditivos, lancamentos, arquivo] = await Promise.all([
    supabase.from("contratos").select("numero, obras(codigo)").eq("id", id).maybeSingle(),
    supabase.from("v_contratos_resumo").select("*").eq("contrato_id", id).maybeSingle(),
    supabase.from("medicoes").select("numero, periodo_inicio, periodo_fim, data_medicao, valor_medido, valor_glosado, situacao, data_envio, data_aprovacao, diferenca_planilha").eq("contrato_id", id).order("numero"),
    supabase.from("v_contrato_itens_saldo").select("*").eq("contrato_id", id),
    supabase.from("aditivos").select("numero, tipo, valor_delta, dias_delta, situacao, data_assinatura").eq("contrato_id", id).order("numero"),
    supabase.from("lancamentos_financeiros").select("tipo, valor, data_prevista, data_efetiva, nota_fiscal").eq("contrato_id", id).order("criado_em"),
    supabase.from("medicao_arquivos").select("ultimo_erro").eq("contrato_id", id).maybeSingle(),
  ]);
  if (!contrato.data || !resumo.data) return new NextResponse("Contrato não encontrado", { status: 404 });

  const listaItens = (itens.data ?? []).sort((a, b) => Number(a.item) - Number(b.item));
  const listaMedicoes = medicoes.data ?? [];
  const wb = montarPlanilhaContrato({
    obra: contrato.data.obras?.codigo ?? "",
    numero: contrato.data.numero,
    resumo: resumo.data,
    avisos: avisosContrato({
      valorContratado: resumo.data.valor_contratado ?? 0,
      somaItens: listaItens.reduce((s, i) => s + (i.valor_total ?? 0), 0),
      itensAcima: listaItens.filter((i) => i.acima_do_contrato).length,
      diferencas: listaMedicoes.filter((m) => m.diferenca_planilha).map((m) => ({ numero: m.numero, diferenca: m.diferenca_planilha as number })),
      erroPlanilha: arquivo.data?.ultimo_erro ?? null,
      diasDesdeLeitura: null,
    }),
    medicoes: listaMedicoes,
    itens: listaItens,
    aditivos: aditivos.data ?? [],
    lancamentos: lancamentos.data ?? [],
    geradoEm: dataHora(new Date().toISOString()),
  });

  const nome = `medicoes-contrato-${(contrato.data.obras?.codigo ?? "obra").replace(/[^A-Za-z0-9-]/g, "_")}.xlsx`;
  return new NextResponse(await wb.xlsx.writeBuffer(), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${nome}"`, "Cache-Control": "no-store" },
  });
}
