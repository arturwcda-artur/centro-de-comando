import { describe, expect, it } from "vitest";
import { dataSugeridaLembrete, faixaGut, textoDoLembrete } from "./gut";

describe("faixa do GUT", () => {
  it("segue a planilha: 64 ou mais é crítico", () => {
    expect([faixaGut(125), faixaGut(64), faixaGut(63), faixaGut(27), faixaGut(26), faixaGut(null)]).toEqual(["alerta", "alerta", "atencao", "atencao", "ok", "neutro"]);
  });
});

describe("data do lembrete", () => {
  it("um dia antes do prazo", () => {
    expect(dataSugeridaLembrete("2026-11-20", "2026-11-12")).toBe("2026-11-19");
  });
  it("prazo amanhã ou vencido: hoje", () => {
    expect(dataSugeridaLembrete("2026-11-13", "2026-11-12")).toBe("2026-11-12");
    expect(dataSugeridaLembrete("2026-11-01", "2026-11-12")).toBe("2026-11-12");
  });
  it("sem prazo: amanhã", () => {
    expect(dataSugeridaLembrete(null, "2026-11-12")).toBe("2026-11-13");
  });
});

describe("texto do lembrete", () => {
  const detalhe = { gravidade: 5, urgencia: 5, tendencia: 3, gut: 75, o_que: "Cobrar sondagem", por_que: "Definir fundação", onde: null, quem: "Adamo", como: null, quanto: null };

  it("leva o 5W2H, sem linhas vazias, e o link da ação", () => {
    const t = textoDoLembrete({ titulo: "[1] Cobrar sondagem", prazo: "2026-11-20", obra: "NILLS", detalhe }, "https://site/matriz-gut/1");
    expect(t.titulo).toBe("Lembrete NILLS · GUT 75: Cobrar sondagem");
    expect(t.descricao).toContain("Por quê: Definir fundação");
    expect(t.descricao).toContain("Quando: 20/11/2026");
    expect(t.descricao).toContain("GUT: 75 (G5 × U5 × T3)");
    expect(t.descricao).not.toContain("Onde:");
    expect(t.descricao.endsWith("https://site/matriz-gut/1")).toBe(true);
  });

  it("sem detalhe, usa o título da tarefa", () => {
    expect(textoDoLembrete({ titulo: "Ação", prazo: null, obra: null, detalhe: null }, "x").titulo).toBe("Lembrete: Ação");
  });
});
