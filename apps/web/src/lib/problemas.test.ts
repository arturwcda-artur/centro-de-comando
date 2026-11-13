import { describe, expect, it } from "vitest";
import { acao5w2hSchema, ordenarFila, problemaSchema, resumoGut } from "./problemas";
import { validar } from "./validacao";

const p = (titulo: string, gut: number, status = "aberto", criado_em = "2026-11-01") => ({ titulo, gravidade: 3, urgencia: 3, tendencia: 3, gut, status, criado_em });

describe("fila de problemas", () => {
  it("abertos primeiro, maior GUT primeiro, empate pelo mais antigo", () => {
    const fila = ordenarFila([p("resolvido", 125, "resolvido"), p("baixo", 8), p("alto novo", 64, "em_andamento", "2026-11-10"), p("alto antigo", 64, "aberto", "2026-11-02")]);
    expect(fila.map((x) => x.titulo)).toEqual(["alto antigo", "alto novo", "baixo", "resolvido"]);
  });
});

describe("textos das notas", () => {
  it("usa as frases da planilha GUT", () => {
    expect(resumoGut({ gravidade: 4, urgencia: 4, tendencia: 4 })).toBe("Muito grave · Curto prazo · Aumenta");
  });
});

describe("validação", () => {
  it("problema exige título e notas de 1 a 5", () => {
    expect(validar(problemaSchema, { titulo: "Infiltração", gravidade: "5", urgencia: "4", tendencia: "3" }).erros).toBeNull();
    expect(validar(problemaSchema, { titulo: "", gravidade: "5", urgencia: "4", tendencia: "3" }).erros?.titulo).toBeTruthy();
    expect(validar(problemaSchema, { titulo: "x", gravidade: "6", urgencia: "4", tendencia: "3" }).erros?.gravidade).toBeTruthy();
  });

  it("ação 5W2H exige o quê; o resto é opcional", () => {
    expect(validar(acao5w2hSchema, { o_que: "Contratar sondagem" }).dados).toMatchObject({ o_que: "Contratar sondagem", prazo: null, quem: null });
    expect(validar(acao5w2hSchema, { o_que: "" }).erros?.o_que).toBeTruthy();
    expect(validar(acao5w2hSchema, { o_que: "x", prazo: "31/12" }).erros?.prazo).toBeTruthy();
  });
});
