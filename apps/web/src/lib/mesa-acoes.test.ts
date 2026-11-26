import { describe, expect, it } from "vitest";
import { acrescentarResultado, resultadoDecidido, resultadoDelegado, resultadoNaoSeAplica, textoDaDecisaoAoDelegar } from "./mesa-acoes";

describe("textos de resultado da Mesa", () => {
  it("decidido por uma pessoa ou pelo gestor", () => {
    expect(resultadoDecidido("Maria Souza")).toBe("Decidido por Maria Souza");
    expect(resultadoDecidido(null)).toBe("Decidido pelo gestor");
    expect(resultadoDecidido("  ")).toBe("Decidido pelo gestor");
  });
  it("não se aplica mais leva o motivo", () => {
    expect(resultadoNaoSeAplica("  obra encerrada ")).toBe("Não se aplica mais: obra encerrada");
  });
  it("delegado mostra pessoa, quadro e lista", () => {
    expect(resultadoDelegado("João", "Obras do Grupo - C.SALLES", "PRF")).toBe("Delegado a João no Trello (Obras do Grupo - C.SALLES › PRF)");
  });
  it("acrescenta ao resultado existente sem duplicar ponto", () => {
    expect(acrescentarResultado("Decidido por Maria.", "Delegado a João")).toBe("Decidido por Maria. Delegado a João");
    expect(acrescentarResultado("Decidido pelo gestor", "Delegado a João")).toBe("Decidido pelo gestor. Delegado a João");
    expect(acrescentarResultado(null, "Delegado a João")).toBe("Delegado a João");
  });
  it("texto da decisão ao delegar", () => {
    expect(textoDaDecisaoAoDelegar("Aprovar troca", "Pedir cotação")).toBe("Aprovar troca");
    expect(textoDaDecisaoAoDelegar(null, " Pedir cotação ")).toBe("Pedir cotação");
  });
});
