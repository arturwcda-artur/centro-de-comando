import { describe, expect, it } from "vitest";
import { listaDaObra, membroPeloNome, prioridadePorGut } from "./cartao-acao";

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

describe("membro pelo nome escrito em Quem", () => {
  const membros = [
    { id: "1", nome: "Celso Souza Lima" },
    { id: "2", nome: "Pedro Victor Vieira Martins" },
    { id: "3", nome: "Pedro Henrique" },
  ];
  it("acha pelo nome completo ou pelo primeiro e último nome, sem acento", () => {
    expect(membroPeloNome(membros, "celso souza lima")).toBe("1");
    expect(membroPeloNome(membros, "Pedro Martins")).toBe("2");
  });
  it("só o primeiro nome vale quando não há dúvida", () => {
    expect(membroPeloNome(membros, "Célso")).toBe("1");
    expect(membroPeloNome(membros, "Pedro")).toBeNull();
  });
  it("vazio ou desconhecido fica sem responsável", () => {
    expect(membroPeloNome(membros, "")).toBeNull();
    expect(membroPeloNome(membros, "Fornecedor X")).toBeNull();
  });
});
