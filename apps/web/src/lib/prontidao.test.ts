import { describe, expect, it } from "vitest";
import { avaliarProntidao, datasDeReferencia, mesQueDeveTerMedicao, pendencias, resumoPorArea, type DadosProntidao } from "./prontidao";
import { lerGatilhos } from "./gatilhos";

// Retrato da PRF Recanto em 27/11/2026
const prf: DadosProntidao = {
  hoje: "2026-11-27",
  situacaoObra: "andamento",
  contrato: { numero: "1/2026", termino: "2027-03-30" },
  aditivos: [{ numero: "01/2026", situacao: "em_analise", tipo: "acrescimo", desde: "2026-11-04" }],
  arquivos: [{ papel: "vigente", erro: false }, { papel: "linha_base", erro: false }],
  vigente: { atualizado: "2026-11-23", termino: "2027-09-29", vencidas: Array.from({ length: 10 }, () => ({ fim: "2026-11-20", critica: false })) },
  medicoes: [{ numero: "1", periodoFim: "2026-04-15", situacao: "aprovada", dataEnvio: null }],
  documentos: { ultimoDiario: null, equipe: 0, art: 0, revisar: 1 },
  problemasAbertos: [40, 18],
};
const item = (d: DadosProntidao, chave: string) => avaliarProntidao(d).find((i) => i.chave === chave);

describe("ficha de prontidão (RN-49r)", () => {
  it("cronograma além do contrato é falta, com os dias de diferença", () => {
    const i = item(prf, "prazo-contratual")!;
    expect(i.situacao).toBe("falta");
    expect(i.detalhe).toContain("183 dias depois do contrato");
  });

  it("medição do mês: exige o mês anterior; até o dia 5, o retrasado", () => {
    expect(mesQueDeveTerMedicao("2026-11-27")).toBe("2026-10");
    expect(mesQueDeveTerMedicao("2026-12-03")).toBe("2026-10");
    expect(mesQueDeveTerMedicao("2027-01-10")).toBe("2026-12");
    expect(item(prf, "medicao-mes")).toMatchObject({ situacao: "falta" });
    expect(item({ ...prf, medicoes: [{ numero: "8", periodoFim: "2026-10-31", situacao: "enviada", dataEnvio: "2026-11-03" }] }, "medicao-mes")).toMatchObject({ situacao: "ok" });
  });

  it("cronograma alterado há mais de 7 dias vence", () => {
    expect(item(prf, "cronograma-atualizado")?.situacao).toBe("ok");
    expect(item({ ...prf, vigente: { ...prf.vigente!, atualizado: "2026-11-10" } }, "cronograma-atualizado")?.situacao).toBe("vencido");
  });

  it("documento não encontrado pede conferência, não é falta certa", () => {
    expect(item(prf, "diario")?.situacao).toBe("atencao");
    expect(item({ ...prf, documentos: { ...prf.documentos, ultimoDiario: "2026-11-20" } }, "diario")?.situacao).toBe("vencido");
  });

  it("só falta e vencido sobem para a Mesa", () => {
    expect(pendencias(avaliarProntidao(prf)).map((i) => i.chave)).toEqual(["prazo-contratual", "medicao-mes"]);
  });

  it("obra parada não cobra medição, diário nem atualização semanal", () => {
    const parada = avaliarProntidao({ ...prf, situacaoObra: "paralisada" }).map((i) => i.chave);
    expect(parada).not.toContain("medicao-mes");
    expect(parada).not.toContain("diario");
    expect(parada).not.toContain("cronograma-atualizado");
  });
});

describe("Sala de Situação", () => {
  it("cada área fica com a pior situação; área sem item fica vazia", () => {
    const r = resumoPorArea(avaliarProntidao(prf));
    expect(r).toEqual({ Contrato: "atencao", Prazo: "falta", Medição: "falta", Documentação: "atencao", Problemas: "ok" });
    expect(resumoPorArea([]).Prazo).toBeNull();
  });
  it("data de referência por área", () => {
    expect(datasDeReferencia(prf)).toEqual({ Contrato: "2026-11-04", Prazo: "2026-11-23", Medição: "2026-04-15", Documentação: null, Problemas: null });
  });
});

describe("contrato sem término", () => {
  it("pede para cadastrar a data, porque o prazo não pode ser conferido", () => {
    const itens = avaliarProntidao({ ...prf, contrato: { numero: "49/2025", termino: null } });
    expect(itens.find((i) => i.chave === "contrato-termino")?.situacao).toBe("atencao");
    expect(itens.find((i) => i.chave === "prazo-contratual")).toBeUndefined();
  });
});

describe("gatilhos na ficha (RN-49u)", () => {
  it("gatilho desligado deixa o item como Atenção e fora da Mesa", () => {
    const g = lerGatilhos([{ chave: "medicao_do_mes", ativo: false, limite: 5 }]);
    const i = avaliarProntidao(prf, g).find((x) => x.chave === "medicao-mes")!;
    expect(i.situacao).toBe("atencao");
    expect(i.detalhe).toContain("gatilho desligado");
  });
  it("limites do gestor: tolerância de prazo e GUT", () => {
    expect(avaliarProntidao(prf, lerGatilhos([{ chave: "prazo_contratual", ativo: true, limite: 200 }])).find((x) => x.chave === "prazo-contratual")?.situacao).toBe("ok");
    expect(avaliarProntidao(prf, lerGatilhos([{ chave: "problema_critico", ativo: true, limite: 40 }])).find((x) => x.chave === "problemas")?.situacao).toBe("falta");
  });
  it("caminho crítico com tolerância em dias", () => {
    const d = { ...prf, vigente: { ...prf.vigente!, vencidas: [{ fim: "2026-11-25", critica: true }] } };
    expect(avaliarProntidao(d).find((x) => x.chave === "atrasadas")?.situacao).toBe("falta");
    expect(avaliarProntidao(d, lerGatilhos([{ chave: "caminho_critico", ativo: true, limite: 5 }])).find((x) => x.chave === "atrasadas")?.situacao).toBe("atencao");
  });
});
