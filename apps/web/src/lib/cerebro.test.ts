import { describe, expect, it } from "vitest";
import { calcularImpacto, somarUteis, uteisEntre, type AtividadePlano, type LigacaoPlano } from "./cerebro";

// Dados de TESTE. 23/11/2026 é segunda-feira.
const at = (id: string, inicio: string, fim: string, extra: Partial<AtividadePlano> = {}): AtividadePlano => ({
  id,
  edt: null,
  nome: id,
  resumo: false,
  marco: false,
  critica: false,
  inicio_previsto: inicio,
  fim_previsto: fim,
  duracao_dias: uteisEntre(inicio, fim) + 1,
  percentual: 0,
  ...extra,
});
const ti = (de: string, para: string, lag = 0, tipo = "TI"): LigacaoPlano => ({ predecessora_id: de, atividade_id: para, tipo, defasagem_dias: lag });
const ctx = { prazoContratual: null, hoje: "2026-11-20", cronograma: "REV-06.mpp" };

describe("dias úteis", () => {
  it("pula sábado e domingo", () => {
    expect(uteisEntre("2026-11-27", "2026-11-30")).toBe(1); // sexta → segunda
    expect(uteisEntre("2026-11-30", "2026-11-27")).toBe(-1);
    expect(somarUteis("2026-11-27", 1)).toBe("2026-11-30");
    expect(somarUteis("2026-11-30", -1)).toBe("2026-11-27");
    expect(somarUteis("2026-11-25", 0)).toBe("2026-11-25");
  });
});

describe("calcularImpacto", () => {
  const A = at("A", "2026-11-23", "2026-11-27", { critica: true });
  const B = at("B", "2026-11-30", "2026-12-04", { critica: true });
  const C = at("C", "2026-12-07", "2026-12-11", { critica: true });

  it("atraso empurra a cadeia e o término", () => {
    const r = calcularImpacto([A, B, C], [ti("A", "B"), ti("B", "C")], { atividadeId: "A", tipo: "atrasar", dias: 3 }, ctx)!;
    expect(r.deslocadas.map((d) => [d.id, d.dias])).toEqual([["B", 3], ["C", 3]]);
    expect(r.terminoAntes).toBe("2026-12-11");
    expect(r.terminoDepois).toBe("2026-12-16");
    expect(r.variacaoUteis).toBe(3);
    expect(r.conflitos.some((c) => c.includes("caminho crítico"))).toBe(true);
    expect(r.rota.at(-1)).toContain("VALIDOS");
  });

  it("a folga absorve parte do atraso", () => {
    const D = at("D", "2026-12-09", "2026-12-11");
    const r = calcularImpacto([A, B, D], [ti("A", "B"), ti("B", "D")], { atividadeId: "B", tipo: "atrasar", dias: 3 }, ctx)!;
    expect(r.deslocadas.map((d) => [d.id, d.dias])).toEqual([["D", 1]]);
  });

  it("adiantar só puxa quem é empurrado por ela", () => {
    const E = at("E", "2026-11-23", "2026-11-27");
    const presa = calcularImpacto([A, B, E], [ti("A", "B"), ti("E", "B")], { atividadeId: "A", tipo: "adiantar", dias: 2 }, ctx)!;
    expect(presa.deslocadas).toEqual([]);
    const livre = calcularImpacto([A, B], [ti("A", "B")], { atividadeId: "A", tipo: "adiantar", dias: 2 }, ctx)!;
    expect(livre.deslocadas.map((d) => [d.id, d.dias])).toEqual([["B", -2]]);
  });

  it("nova duração mexe só no fim da atividade e segue pela ligação com defasagem", () => {
    const F = at("F", "2026-12-02", "2026-12-04"); // TI com 2 dias de defasagem depois de A
    const r = calcularImpacto([A, F], [ti("A", "F", 2)], { atividadeId: "A", tipo: "duracao", dias: 7 }, ctx)!;
    expect(r.alvo.inicioNovo).toBe("2026-11-23");
    expect(r.alvo.fimNovo).toBe("2026-12-01");
    expect(r.deslocadas.map((d) => [d.id, d.dias])).toEqual([["F", 2]]);
    expect(r.rota[1]).toContain("de 5 para 7 dias úteis");
  });

  it("aponta o prazo contratual e o marco deslocado", () => {
    const M = at("M", "2026-12-11", "2026-12-11", { marco: true });
    const r = calcularImpacto([A, B, C, M], [ti("A", "B"), ti("B", "C"), ti("C", "M", 0, "TT")], { atividadeId: "A", tipo: "atrasar", dias: 5 }, { ...ctx, prazoContratual: "2026-12-15" })!;
    expect(r.conflitos.some((c) => c.includes("prazo contratual"))).toBe(true);
    expect(r.conflitos.some((c) => c.includes("marco M"))).toBe(true);
    expect(r.conflitos.some((c) => c.includes("mês de término"))).toBe(true); // A termina em novembro e passa para dezembro
  });

  it("avisa quando o cronograma não tem ligações", () => {
    const r = calcularImpacto([A, B], [], { atividadeId: "A", tipo: "atrasar", dias: 2 }, ctx)!;
    expect(r.deslocadas).toEqual([]);
    expect(r.avisos[0]).toContain("não tem ligações");
  });
});
