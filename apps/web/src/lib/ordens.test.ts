import { describe, expect, it } from "vitest";
import { GATILHOS_PADRAO, lerGatilhos } from "./gatilhos";
import { situacaoDaOrdem } from "./ordens";

const hoje = "2026-11-27";
const ordem = (x = {}) => ({ status: "a_fazer", prazo: "2026-12-05", atualizado_em: "2026-11-26T10:00:00Z", concluida_em: null, ordem_conferida_em: null, ...x });

describe("situação da ordem (RN-49t)", () => {
  it("em dia, vencida e parada", () => {
    expect(situacaoDaOrdem(ordem(), hoje)).toMatchObject({ codigo: "em_dia", cobrar: false });
    expect(situacaoDaOrdem(ordem({ prazo: "2026-11-25" }), hoje)).toMatchObject({ codigo: "vencida", texto: "Vencida há 2 dias", cobrar: false });
    expect(situacaoDaOrdem(ordem({ prazo: "2026-11-24" }), hoje)).toMatchObject({ codigo: "vencida", cobrar: true });
    expect(situacaoDaOrdem(ordem({ prazo: null, atualizado_em: "2026-11-19T10:00:00Z" }), hoje)).toMatchObject({ codigo: "parada", texto: "Sem movimento há 8 dias", cobrar: true });
  });
  it("concluída espera conferência; conferida sai", () => {
    expect(situacaoDaOrdem(ordem({ status: "concluida", concluida_em: "2026-11-26T10:00:00Z" }), hoje).codigo).toBe("conferir");
    expect(situacaoDaOrdem(ordem({ status: "concluida", concluida_em: "2026-11-26T10:00:00Z", ordem_conferida_em: "2026-11-27T09:00:00Z" }), hoje).texto).toBe("Conferida em 27/11/2026");
  });
  it("gatilho desligado não cobra; limite muda quando cobra", () => {
    const g = lerGatilhos([{ chave: "ordem_vencida", ativo: false, limite: 3 }, { chave: "ordem_parada", ativo: true, limite: 10 }]);
    expect(situacaoDaOrdem(ordem({ prazo: "2026-11-01" }), hoje, g).cobrar).toBe(false);
    expect(situacaoDaOrdem(ordem({ prazo: null, atualizado_em: "2026-11-19T10:00:00Z" }), hoje, g).codigo).toBe("em_dia");
  });
  it("gatilho desconhecido é ignorado e o padrão completa", () => {
    expect(lerGatilhos([{ chave: "outro", ativo: false, limite: 1 }])).toEqual(GATILHOS_PADRAO);
  });
});
