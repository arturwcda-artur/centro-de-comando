import { describe, expect, it } from "vitest";
import { aprovacaoSchema, compromissoSchema, decisaoSchema, empresaSchema, executadoAnteriorSchema, mensagemDoBanco, obraSchema, riscoSchema, validar } from "./validacao";
import { nivelSeveridade } from "./dominio";

const UUID = "00000000-0000-4000-8000-000000000001";

describe("validação de obras", () => {
  it("normaliza código, UF e campos vazios", () => {
    const { dados, erros } = validar(obraSchema, { codigo: " prf-recanto ", nome: "PRF Recanto", situacao: "andamento", uf: "df", cidade: "", empresa_id: "" });
    expect(erros).toBeNull();
    expect(dados).toMatchObject({ codigo: "PRF-RECANTO", uf: "DF", cidade: null, empresa_id: null });
  });

  it("aponta o campo com problema", () => {
    const { erros } = validar(obraSchema, { codigo: "com espaço", nome: "", situacao: "inventada", uf: "XX" });
    expect(erros).toMatchObject({ codigo: expect.stringContaining("hífen"), nome: "Nome é obrigatório.", situacao: "Situação inválida.", uf: "UF inválida." });
  });

  it("término previsto não pode ser antes do início", () => {
    const { erros } = validar(obraSchema, { codigo: "X", nome: "X", situacao: "andamento", data_inicio: "2026-11-10", data_termino_prevista: "2026-11-01" });
    expect(erros?.data_termino_prevista).toMatch(/antes do início/);
  });

  it("aceita FormData", () => {
    const fd = new FormData();
    fd.set("codigo", "A1");
    fd.set("nome", "Obra");
    fd.set("situacao", "planejamento");
    expect(validar(obraSchema, fd).erros).toBeNull();
  });
});

describe("validação de cadastros, riscos e decisões", () => {
  it("CNPJ aceita máscara e exige 14 dígitos", () => {
    expect(validar(empresaSchema, { razao_social: "X", cnpj: "12.345.678/0001-90" }).dados?.cnpj).toBe("12345678000190");
    expect(validar(empresaSchema, { razao_social: "X", cnpj: "123" }).erros?.cnpj).toMatch(/14 dígitos/);
  });

  it("probabilidade e impacto de 1 a 5", () => {
    const { erros } = validar(riscoSchema, { obra_id: UUID, descricao: "Chuva", probabilidade: "6", impacto: "0" });
    expect(erros).toMatchObject({ probabilidade: expect.any(String), impacto: expect.any(String) });
  });

  it("decisão 'tomada' exige o texto da decisão (RN-51)", () => {
    expect(validar(decisaoSchema, { obra_id: UUID, problema: "P", status: "tomada" }).erros?.decisao).toMatch(/RN-51/);
    expect(validar(decisaoSchema, { obra_id: UUID, problema: "P", status: "tomada", decisao: "Fazer" }).erros).toBeNull();
  });

  it("aprovação aceita empresa nova digitada", () => {
    const { dados } = validar(aprovacaoSchema, { proposta_id: UUID, codigo: "ANP", nome: "ANP", situacao: "andamento", nova_empresa: "L7 Construtora" });
    expect(dados).toMatchObject({ empresa_id: null, nova_empresa: "L7 Construtora" });
  });
});

describe("compromissos da agenda", () => {
  const base = { titulo: "Vistoria", data: "2026-11-10", inicio: "09:00", fim: "10:00" };

  it("aceita compromisso com horário e assume a mesma data final", () => {
    expect(validar(compromissoSchema, base).dados).toMatchObject({ data_fim: "2026-11-10", dia_inteiro: false });
  });

  it("dia inteiro dispensa horários", () => {
    expect(validar(compromissoSchema, { titulo: "Feriado", data: "2026-11-15", dia_inteiro: "on" }).erros).toBeNull();
  });

  it("recusa término antes do início e horário ausente", () => {
    expect(validar(compromissoSchema, { ...base, fim: "08:00" }).erros?.fim).toBeTruthy();
    expect(validar(compromissoSchema, { ...base, inicio: "" }).erros?.inicio).toBeTruthy();
  });

  it("aceita término menor quando acaba em outro dia, mas recusa data final anterior", () => {
    expect(validar(compromissoSchema, { ...base, inicio: "22:00", fim: "02:00", data_fim: "2026-11-11" }).erros).toBeNull();
    expect(validar(compromissoSchema, { ...base, data_fim: "2026-11-09" }).erros?.data_fim).toBeTruthy();
  });
});

describe("valor executado antes da retomada", () => {
  it("exige valor não negativo e data", () => {
    expect(validar(executadoAnteriorSchema, { valor: "63892.61", data: "2026-04-17" }).dados).toEqual({ valor: 63892.61, data: "2026-04-17" });
    expect(validar(executadoAnteriorSchema, { valor: "-1", data: "2026-04-17" }).erros?.valor).toBeTruthy();
    expect(validar(executadoAnteriorSchema, { valor: "10", data: "" }).erros?.data).toBeTruthy();
  });
});

describe("mensagens e severidade", () => {
  it("traduz erros do banco", () => {
    expect(mensagemDoBanco({ code: "23505", message: 'duplicate key value violates unique constraint "obras_codigo_key"' })).toBe("Já existe uma obra com esse código.");
    expect(mensagemDoBanco({ code: "P0002" })).toBe("Essa proposta já foi revisada.");
  });

  it("classifica severidade (RN-50)", () => {
    expect(nivelSeveridade(15).rotulo).toBe("Crítico");
    expect(nivelSeveridade(8).rotulo).toBe("Alto");
    expect(nivelSeveridade(7).rotulo).toBe("Moderado");
  });
});
