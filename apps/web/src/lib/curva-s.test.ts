import { describe, expect, it } from "vitest";
import { atrasada, serieSemanal, terminoPrevisto, valorAcumulado, type AtividadeCurva } from "./curva-s";

const a = (custo: number | null, inicio: string | null, fim: string | null, extra: Partial<AtividadeCurva> = {}): AtividadeCurva => ({
  custo,
  inicio_previsto: inicio,
  fim_previsto: fim,
  resumo: false,
  marco: false,
  ...extra,
});

describe("valorAcumulado", () => {
  const quatroDias = [a(400, "2026-11-02", "2026-11-05")];

  it("distribui o custo igualmente pelos dias corridos", () => {
    expect(valorAcumulado(quatroDias, "2026-11-01")).toBe(0);
    expect(valorAcumulado(quatroDias, "2026-11-02")).toBe(100);
    expect(valorAcumulado(quatroDias, "2026-11-03")).toBe(200);
    expect(valorAcumulado(quatroDias, "2026-11-05")).toBe(400);
    expect(valorAcumulado(quatroDias, "2026-12-01")).toBe(400);
  });

  it("começa no valor já executado", () => {
    expect(valorAcumulado(quatroDias, "2026-11-01", 1000)).toBe(1000);
    expect(valorAcumulado(quatroDias, "2026-11-03", 1000)).toBe(1200);
  });

  it("atividade de um dia cai inteira na data", () => {
    const umDia = [a(500, "2026-11-10", "2026-11-10")];
    expect(valorAcumulado(umDia, "2026-11-09")).toBe(0);
    expect(valorAcumulado(umDia, "2026-11-10")).toBe(500);
  });

  it("não conta linhas de resumo, atividades sem custo ou sem data", () => {
    const lista = [a(999, "2026-11-02", "2026-11-05", { resumo: true }), a(null, "2026-11-02", "2026-11-05"), a(100, null, null)];
    expect(valorAcumulado(lista, "2026-12-01")).toBe(0);
  });
});

describe("serieSemanal", () => {
  it("tem um ponto por semana e termina no valor total", () => {
    const s = serieSemanal([a(1000, "2026-11-02", "2026-11-20")]);
    expect(s.map((p) => p.data)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-20"]);
    expect(s.at(-1)?.valor).toBeCloseTo(1000);
  });

  it("marco sem custo não estica a curva até o limite contratual", () => {
    const s = serieSemanal([a(1000, "2026-11-02", "2026-11-06"), a(0, "2027-09-29", "2027-09-29", { marco: true })]);
    expect(s.at(-1)?.data).toBe("2026-11-06");
  });

  it("parte do valor anterior", () => {
    expect(serieSemanal([a(100, "2026-11-02", "2026-11-03")], 500).at(-1)?.valor).toBe(600);
  });

  it("sem atividades com custo, não há curva", () => {
    expect(serieSemanal([])).toEqual([]);
  });
});

describe("terminoPrevisto", () => {
  it("ignora marcos e resumos", () => {
    const lista = [a(1, "2026-11-02", "2027-04-08"), a(0, "2027-09-29", "2027-09-29", { marco: true }), a(9, "2026-11-02", "2028-01-01", { resumo: true })];
    expect(terminoPrevisto(lista)).toBe("2027-04-08");
  });
});

describe("atrasada", () => {
  const base = { resumo: false, fim_previsto: "2026-11-03", percentual: 50 };

  it("término antes de hoje e abaixo de 100%", () => {
    expect(atrasada(base, "2026-11-04")).toBe(true);
    expect(atrasada({ ...base, percentual: 100 }, "2026-11-04")).toBe(false);
    expect(atrasada(base, "2026-11-03")).toBe(false);
    expect(atrasada({ ...base, resumo: true }, "2026-11-04")).toBe(false);
    expect(atrasada({ ...base, fim_previsto: null }, "2026-11-04")).toBe(false);
  });
});
