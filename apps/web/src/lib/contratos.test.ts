import { describe, expect, it } from "vitest";
import { avisosContrato, planilhaSugerida, valorAnterior } from "./contratos";
import { aditivoSchema, contratoSchema, lancamentoSchema, medicaoSituacaoSchema, validar } from "./validacao";

const UUID = "00000000-0000-4000-8000-000000000001";

describe("avisosContrato", () => {
  const base = { valorContratado: 1000, somaItens: 1000, itensAcima: 0, diferencas: [], erroPlanilha: null, diasDesdeLeitura: 1 };

  it("sem problemas, sem avisos", () => {
    expect(avisosContrato(base)).toEqual([]);
    expect(avisosContrato({ ...base, somaItens: 0, diasDesdeLeitura: null })).toEqual([]);
  });

  it("avisa total diferente, item acima, planilha alterada, erro e leitura antiga", () => {
    const a = avisosContrato({ valorContratado: 1000, somaItens: 900, itensAcima: 2, diferencas: [{ numero: 1, diferenca: 50 }], erroPlanilha: "Arquivo não encontrado", diasDesdeLeitura: 8 });
    expect(a).toHaveLength(5);
    expect(a.join(" ")).toContain("medição 1");
  });
});

describe("valorAnterior", () => {
  const digitado = { valor: 500, data: "2026-04-30" };
  const aprovada = { situacao: "aprovada", periodo_fim: "2026-04-15", valor_medido: 63884.16, valor_glosado: 0 };

  it("usa as medições aprovadas antes do início do vigente", () => {
    expect(valorAnterior([aprovada], "2026-10-13", digitado)).toEqual({ valor: 63884.16, data: "2026-04-15", origem: "medicoes" });
  });

  it("desconta a glosa", () => {
    expect(valorAnterior([{ ...aprovada, situacao: "glosada", valor_glosado: 884.16 }], "2026-10-13", digitado).valor).toBe(63000);
  });

  it("sem aprovadas anteriores, fica com o valor digitado", () => {
    expect(valorAnterior([{ ...aprovada, situacao: "elaborada" }], "2026-10-13", digitado).origem).toBe("digitado");
    expect(valorAnterior([{ ...aprovada, periodo_fim: "2026-11-01" }], "2026-10-13", digitado).valor).toBe(500);
  });

  it("sem nenhum valor, parte de zero", () => {
    expect(valorAnterior([], null, { valor: null, data: null })).toEqual({ valor: 0, data: null, origem: "digitado" });
  });
});

describe("planilhaSugerida", () => {
  it("só para a obra piloto com pasta cadastrada", () => {
    expect(planilhaSugerida("PRF-RECANTO", "C:\\obra")).toContain("05_Medicoes");
    expect(planilhaSugerida("OUTRA", "C:\\obra")).toBeNull();
    expect(planilhaSugerida("PRF-RECANTO", null)).toBeNull();
  });
});

describe("formulários", () => {
  it("contrato exige obra, número e valor", () => {
    expect(validar(contratoSchema, { obra_id: UUID, numero: "1/2026", valor_original: "2392720.93" }).dados).toMatchObject({ valor_original: 2392720.93, planilha: null, prazo_original_dias: null });
    expect(validar(contratoSchema, { obra_id: "", numero: "", valor_original: "-1" }).erros).toMatchObject({ obra_id: expect.any(String), numero: expect.any(String), valor_original: expect.any(String) });
  });

  it("contrato não aceita término antes do início", () => {
    expect(validar(contratoSchema, { obra_id: UUID, numero: "1", valor_original: "1", data_inicio: "2026-02-01", data_termino_original: "2026-01-01" }).erros?.data_termino_original).toBeTruthy();
  });

  it("aditivo segue a RN-18", () => {
    const base = { numero: "1", dias_delta: "0", situacao: "em_analise" };
    expect(validar(aditivoSchema, { ...base, tipo: "supressao", valor_delta: "100" }).erros?.valor_delta).toMatch(/RN-18/);
    expect(validar(aditivoSchema, { ...base, tipo: "acrescimo", valor_delta: "-100" }).erros?.valor_delta).toMatch(/RN-18/);
    expect(validar(aditivoSchema, { ...base, tipo: "prazo", valor_delta: "1" }).erros?.valor_delta).toMatch(/RN-18/);
    expect(validar(aditivoSchema, { ...base, tipo: "supressao", valor_delta: "-100" }).erros).toBeNull();
  });

  it("situação da medição aceita só opções válidas", () => {
    expect(validar(medicaoSituacaoSchema, { situacao: "aprovada", valor_glosado: "0" }).erros).toBeNull();
    expect(validar(medicaoSituacaoSchema, { situacao: "inventada", valor_glosado: "0" }).erros?.situacao).toBeTruthy();
  });

  it("lançamento exige alguma data", () => {
    expect(validar(lancamentoSchema, { tipo: "faturamento", valor: "10" }).erros?.data_prevista).toBeTruthy();
    expect(validar(lancamentoSchema, { tipo: "faturamento", valor: "10", data_efetiva: "2026-05-10" }).erros).toBeNull();
  });
});
