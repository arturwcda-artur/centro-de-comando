import { describe, expect, it } from "vitest";
import { motivosPrioridade, podeConcluir } from "./dominio";
import { tarefaRapidaSchema, tarefaSchema, validar } from "./validacao";

describe("validação de tarefas", () => {
  it("aguardando terceiro exige indicar quem (RN-44)", () => {
    expect(validar(tarefaSchema, { titulo: "Cobrar projeto", status: "aguardando_terceiro" }).erros?.aguardando_pessoa_id).toMatch(/RN-44/);
  });

  it("aplica padrões: ação, a fazer, importância e impacto 3, não crítica", () => {
    const { dados } = validar(tarefaSchema, { titulo: "Revisar medição" });
    expect(dados).toMatchObject({ tipo: "acao", status: "a_fazer", importancia: 3, impacto: 3, critica: false, prazo: null });
  });

  it("checkbox 'crítica' marcado vira true", () => {
    expect(validar(tarefaSchema, { titulo: "X", critica: "on" }).dados?.critica).toBe(true);
  });

  it("captura rápida exige só o título", () => {
    expect(validar(tarefaRapidaSchema, { titulo: "" }).erros?.titulo).toBeDefined();
    expect(validar(tarefaRapidaSchema, { titulo: "Ligar fiscal", prazo: "2026-11-04", obra_id: "" }).dados).toEqual({ titulo: "Ligar fiscal", prazo: "2026-11-04", obra_id: null });
  });
});

describe("quem pode concluir pelo sistema (RN-48)", () => {
  it("tarefas manuais, do Notion e cartões do proprietário podem", () => {
    expect(podeConcluir({ fonte: "manual", status: "a_fazer" })).toBe(true);
    expect(podeConcluir({ fonte: "notion", status: "a_fazer" })).toBe(true);
    expect(podeConcluir({ fonte: "trello", responsavel_id: null, status: "a_fazer" })).toBe(true);
  });

  it("cartão de terceiros no Trello não pode", () => {
    expect(podeConcluir({ fonte: "trello", responsavel_id: "equipe", status: "a_fazer" })).toBe(false);
  });

  it("tarefa já encerrada não pode", () => {
    expect(podeConcluir({ fonte: "manual", status: "concluida" })).toBe(false);
    expect(podeConcluir({ fonte: "trello", status: "cancelada" })).toBe(false);
  });
});

describe("motivos da prioridade (recomendação, não altera prazos)", () => {
  it("explica por que a tarefa está no topo", () => {
    expect(motivosPrioridade({ vencida: true, dias_para_prazo: -3, critica: true, impacto: 5, tipo: "cobranca" })).toEqual([
      "vencida há 3 dia(s)",
      "marcada como crítica",
      "impacto alto",
      "cobrança",
    ]);
    expect(motivosPrioridade({ vence_hoje: true, dias_para_prazo: 0 })).toEqual(["vence hoje"]);
    expect(motivosPrioridade({ dias_para_prazo: 2 })).toEqual(["vence em 2 dia(s)"]);
    expect(motivosPrioridade({ dias_para_prazo: 10, impacto: 3 })).toEqual([]);
  });
});
