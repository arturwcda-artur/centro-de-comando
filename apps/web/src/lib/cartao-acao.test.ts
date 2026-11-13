import { describe, expect, it } from "vitest";
import { descricaoDoCartao, listaDaObra, prioridadePorGut } from "./cartao-acao";

describe("prioridade pela GUT", () => {
  it("segue as faixas da tela", () => {
    expect(prioridadePorGut(80)).toBe("alta");
    expect(prioridadePorGut(30)).toBe("media");
    expect(prioridadePorGut(8)).toBe("baixa");
    expect(prioridadePorGut(null)).toBe("media");
  });
});

describe("lista da obra", () => {
  const listas = [
    { id: "a", nome: "CONCLUIDOS/DESCARTES" },
    { id: "b", nome: "NILLS" },
    { id: "c", nome: "MANUTENÇÃO/LEVORSSE" },
  ];
  it("acha pelo código, sem diferenciar acento e maiúsculas", () => {
    expect(listaDaObra(listas, { codigo: "Nills", nome: "Reforma Nills Centro" })).toBe("b");
    expect(listaDaObra(listas, { codigo: "LEV", nome: "Levorsse" })).toBe("c");
  });
  it("sem obra ou sem lista parecida, não escolhe", () => {
    expect(listaDaObra(listas, null)).toBeNull();
    expect(listaDaObra(listas, { codigo: "PRF", nome: "PRF Recanto" })).toBeNull();
  });
});

describe("descrição do cartão", () => {
  it("leva o problema e só os campos preenchidos do 5W2H", () => {
    const d = descricaoDoCartao({ problema: "Telhado com infiltração", gut: 64, obra: "NILLS", por_que: "Chuva", como: "Trocar telhas", prazo: "2026-11-20" });
    expect(d).toContain("Problema: Telhado com infiltração (GUT 64) — NILLS");
    expect(d).toContain("Por quê: Chuva\nComo: Trocar telhas\nPrazo: 20/11/2026");
    expect(d).not.toContain("Onde:");
  });
});
