import ExcelJS from "exceljs";

const MOEDA = '"R$" #,##0.00';
const DATA = "dd/mm/yyyy";

/** Texto vindo do banco não pode virar fórmula ao abrir no Excel. */
export function textoSeguro(valor: string | null | undefined): string {
  const t = valor ?? "";
  return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
}

const dataReal = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`) : null);

export type DadosPlanilhaContrato = {
  obra: string;
  numero: string;
  resumo: { valor_original: number | null; valor_aditivos: number | null; valor_contratado: number | null; valor_medido: number | null; valor_faturado: number | null; valor_recebido: number | null; saldo_a_medir: number | null; saldo_a_receber: number | null; data_termino_vigente: string | null };
  avisos: string[];
  medicoes: { numero: number; periodo_inicio: string; periodo_fim: string; data_medicao: string | null; valor_medido: number; valor_glosado: number; situacao: string; data_envio: string | null; data_aprovacao: string | null }[];
  itens: { item: string | null; descricao: string | null; unidade: string | null; quantidade: number | null; quantidade_medida: number | null; quantidade_saldo: number | null; valor_total: number | null; valor_saldo: number | null }[];
  aditivos: { numero: string; tipo: string; valor_delta: number; dias_delta: number; situacao: string; data_assinatura: string | null }[];
  lancamentos: { tipo: string; valor: number; data_prevista: string | null; data_efetiva: string | null; nota_fiscal: string | null }[];
  geradoEm: string;
};

function aba(wb: ExcelJS.Workbook, nome: string, colunas: { titulo: string; largura: number; formato?: string }[]) {
  const ws = wb.addWorksheet(nome, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = colunas.map((c) => ({ header: c.titulo, width: c.largura, style: c.formato ? { numFmt: c.formato } : {} }));
  ws.getRow(1).font = { bold: true };
  return ws;
}

/** Monta o arquivo Excel do contrato. Valores e datas ficam como números e datas de verdade, para somar e filtrar. */
export function montarPlanilhaContrato(d: DadosPlanilhaContrato): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Centro de Comando";

  const resumo = wb.addWorksheet("Resumo");
  resumo.columns = [{ width: 28 }, { width: 22 }];
  resumo.addRow(["Uso interno"]).font = { bold: true };
  resumo.addRow(["Obra", textoSeguro(d.obra)]);
  resumo.addRow(["Contrato", textoSeguro(d.numero)]);
  resumo.addRow(["Gerado em", d.geradoEm]);
  resumo.addRow([]);
  const valores: [string, number | null][] = [
    ["Valor original", d.resumo.valor_original],
    ["Aditivos aprovados", d.resumo.valor_aditivos],
    ["Contratado", d.resumo.valor_contratado],
    ["Medido", d.resumo.valor_medido],
    ["Faturado", d.resumo.valor_faturado],
    ["Recebido", d.resumo.valor_recebido],
    ["Saldo a medir", d.resumo.saldo_a_medir],
    ["Saldo a receber", d.resumo.saldo_a_receber],
  ];
  for (const [rotulo, valor] of valores) resumo.addRow([rotulo, valor ?? 0]).getCell(2).numFmt = MOEDA;
  resumo.addRow(["Término vigente", dataReal(d.resumo.data_termino_vigente)]).getCell(2).numFmt = DATA;
  if (d.avisos.length) {
    resumo.addRow([]);
    resumo.addRow(["Avisos"]).font = { bold: true };
    for (const a of d.avisos) resumo.addRow([textoSeguro(a)]);
  }

  const medicoes = aba(wb, "Medições", [
    { titulo: "Número", largura: 9 },
    { titulo: "Início", largura: 12, formato: DATA },
    { titulo: "Fim", largura: 12, formato: DATA },
    { titulo: "Data da medição", largura: 15, formato: DATA },
    { titulo: "Valor medido", largura: 16, formato: MOEDA },
    { titulo: "Glosa", largura: 14, formato: MOEDA },
    { titulo: "Situação", largura: 14 },
    { titulo: "Envio", largura: 12, formato: DATA },
    { titulo: "Aprovação", largura: 12, formato: DATA },
  ]);
  for (const m of d.medicoes) medicoes.addRow([m.numero, dataReal(m.periodo_inicio), dataReal(m.periodo_fim), dataReal(m.data_medicao), m.valor_medido, m.valor_glosado, m.situacao, dataReal(m.data_envio), dataReal(m.data_aprovacao)]);

  const itens = aba(wb, "Saldo por serviço", [
    { titulo: "Item", largura: 8 },
    { titulo: "Serviço", largura: 60 },
    { titulo: "Unidade", largura: 9 },
    { titulo: "Contrato", largura: 12, formato: "#,##0.00" },
    { titulo: "Medido", largura: 12, formato: "#,##0.00" },
    { titulo: "Saldo", largura: 12, formato: "#,##0.00" },
    { titulo: "Valor contratado", largura: 16, formato: MOEDA },
    { titulo: "Valor do saldo", largura: 16, formato: MOEDA },
  ]);
  for (const i of d.itens) itens.addRow([textoSeguro(i.item), textoSeguro(i.descricao), textoSeguro(i.unidade), i.quantidade, i.quantidade_medida, i.quantidade_saldo, i.valor_total, i.valor_saldo]);

  const aditivos = aba(wb, "Aditivos", [
    { titulo: "Número", largura: 10 },
    { titulo: "Tipo", largura: 14 },
    { titulo: "Valor", largura: 16, formato: MOEDA },
    { titulo: "Dias", largura: 8 },
    { titulo: "Situação", largura: 14 },
    { titulo: "Assinatura", largura: 12, formato: DATA },
  ]);
  for (const a of d.aditivos) aditivos.addRow([textoSeguro(a.numero), a.tipo, a.valor_delta, a.dias_delta, a.situacao, dataReal(a.data_assinatura)]);

  const lancamentos = aba(wb, "Lançamentos", [
    { titulo: "Tipo", largura: 22 },
    { titulo: "Valor", largura: 16, formato: MOEDA },
    { titulo: "Data prevista", largura: 13, formato: DATA },
    { titulo: "Data efetiva", largura: 13, formato: DATA },
    { titulo: "Nota fiscal", largura: 14 },
  ]);
  for (const l of d.lancamentos) lancamentos.addRow([l.tipo, l.valor, dataReal(l.data_prevista), dataReal(l.data_efetiva), textoSeguro(l.nota_fiscal)]);

  return wb;
}
