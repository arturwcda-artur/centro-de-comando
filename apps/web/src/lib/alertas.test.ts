import { describe, expect, it } from "vitest";
import { montarAlertas } from "./alertas";

const base = { hoje: "2026-11-05", contratos: [], terminos: {}, ultimaMedicao: {}, vencimentos: [], tarefasVencidas: 0, cartoesParados: 0, riscosCriticos: 0, integracoes: [] };
const contrato = (extra = {}) => ({ contrato_id: "c1", numero: "01/2026", obra_id: "o1", data_termino_vigente: "2027-03-30", saldo_a_medir: 100, ...extra });
const textos = (extra: Partial<Parameters<typeof montarAlertas>[0]>) => montarAlertas({ ...base, ...extra }).map((a) => a.texto);

describe("alertas de contrato", () => {
  it("sem nada a avisar, a lista fica vazia", () => {
    expect(montarAlertas({ ...base, contratos: [contrato()] })).toEqual([]);
  });

  it("avisa contrato que termina antes do cronograma", () => {
    const [a] = montarAlertas({ ...base, contratos: [contrato()], terminos: { o1: "2027-04-08" } });
    expect(a.grave).toBe(true);
    expect(a.texto).toContain("antes do cronograma");
  });

  it("avisa término nos próximos 60 dias", () => {
    expect(textos({ contratos: [contrato({ data_termino_vigente: "2027-01-04" })] })).toHaveLength(1);
    expect(textos({ contratos: [contrato({ data_termino_vigente: "2027-01-05" })] })).toEqual([]);
  });

  it("contrato vencido só alerta com saldo a medir", () => {
    expect(textos({ contratos: [contrato({ data_termino_vigente: "2026-10-01" })] })[0]).toContain("venceu");
    expect(textos({ contratos: [contrato({ data_termino_vigente: "2026-10-01", saldo_a_medir: 0 })] })).toEqual([]);
  });

  it("avisa medição atrasada só para quem já mediu e tem saldo", () => {
    expect(textos({ contratos: [contrato()], ultimaMedicao: { c1: "2026-09-30" } })).toHaveLength(1);
    expect(textos({ contratos: [contrato()], ultimaMedicao: { c1: "2026-10-01" } })).toEqual([]);
    expect(textos({ contratos: [contrato({ saldo_a_medir: 0 })], ultimaMedicao: { c1: "2026-09-30" } })).toEqual([]);
    expect(textos({ contratos: [contrato()] })).toEqual([]);
  });
});

describe("alertas de prazo", () => {
  it("tarefas viram uma linha só, com plural certo", () => {
    expect(textos({ tarefasVencidas: 1 })).toEqual(["1 tarefa vencida."]);
    expect(textos({ tarefasVencidas: 3 })).toEqual(["3 tarefas vencidas."]);
  });

  it("marco, recebimento e decisão entram até 7 dias; tarefa e término não repetem", () => {
    const vencimentos = [
      { tipo: "marco", descricao: "Entrega", data: "2026-11-12" },
      { tipo: "decisao", descricao: "Longe", data: "2026-11-13" },
      { tipo: "tarefa", descricao: "Tarefa", data: "2026-11-06" },
      { tipo: "termino_contrato", descricao: "Término", data: "2026-11-06" },
    ];
    expect(textos({ vencimentos })).toHaveLength(1);
  });

  it("o que já venceu é grave", () => {
    const [a] = montarAlertas({ ...base, vencimentos: [{ tipo: "recebimento_previsto", descricao: "Parcela", data: "2026-11-01" }] });
    expect(a.grave).toBe(true);
    expect(a.texto).toContain("Venceu");
  });
});

describe("ordem", () => {
  it("graves vêm primeiro", () => {
    const r = montarAlertas({ ...base, cartoesParados: 2, riscosCriticos: 1, integracoes: ["Trello: erro"] });
    expect(r.map((a) => a.grave)).toEqual([true, true, false]);
  });
});
