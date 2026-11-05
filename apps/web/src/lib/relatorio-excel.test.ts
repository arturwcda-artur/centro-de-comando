import { describe, expect, it } from "vitest";
import { montarPlanilhaContrato, textoSeguro, type DadosPlanilhaContrato } from "./relatorio-excel";

const dados: DadosPlanilhaContrato = {
  obra: "PRF-RECANTO",
  numero: "1/2026",
  resumo: { valor_original: 1000, valor_aditivos: 0, valor_contratado: 1000, valor_medido: 200, valor_faturado: 0, valor_recebido: 0, saldo_a_medir: 800, saldo_a_receber: 0, data_termino_vigente: "2027-03-30" },
  avisos: ["Soma diferente do contrato"],
  medicoes: [{ numero: 1, periodo_inicio: "2026-04-06", periodo_fim: "2026-04-15", data_medicao: "2026-05-06", valor_medido: 63884.16, valor_glosado: 0, situacao: "aprovada", data_envio: null, data_aprovacao: null }],
  itens: [{ item: "1", descricao: "=HYPERLINK(1)", unidade: "H", quantidade: 10, quantidade_medida: 2, quantidade_saldo: 8, valor_total: 100, valor_saldo: 80 }],
  aditivos: [],
  lancamentos: [],
  geradoEm: "05/11/2026 10:00",
};

describe("textoSeguro", () => {
  it("impede que texto vire fórmula", () => {
    for (const t of ["=1+1", "+55", "-1", "@soma"]) expect(textoSeguro(t)).toBe(`'${t}`);
  });

  it("mantém texto comum e vazio", () => {
    expect(textoSeguro("Tapume")).toBe("Tapume");
    expect(textoSeguro(null)).toBe("");
  });
});

describe("montarPlanilhaContrato", () => {
  const wb = montarPlanilhaContrato(dados);

  it("tem as cinco abas", () => {
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Resumo", "Medições", "Saldo por serviço", "Aditivos", "Lançamentos"]);
  });

  it("marca uso interno", () => {
    expect(wb.getWorksheet("Resumo")?.getCell("A1").value).toBe("Uso interno");
  });

  it("valores são números e datas de verdade", () => {
    const linha = wb.getWorksheet("Medições")?.getRow(2);
    expect(linha?.getCell(5).value).toBe(63884.16);
    expect(linha?.getCell(2).value).toBeInstanceOf(Date);
  });

  it("protege o texto dos serviços", () => {
    expect(wb.getWorksheet("Saldo por serviço")?.getRow(2).getCell(2).value).toBe("'=HYPERLINK(1)");
  });

  it("gera um arquivo válido", async () => {
    const arquivo = await wb.xlsx.writeBuffer();
    expect(arquivo.byteLength).toBeGreaterThan(1000);
  });
});
