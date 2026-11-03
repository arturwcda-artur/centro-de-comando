import { describe, expect, it } from "vitest";
import { calcularIndicadores, type ObraResumo } from "./indicadores";
import { MODULOS, moduloAtivo } from "./navegacao";

// Linhas de teste da view v_obra_resumo — não são obras reais.
function obra(campos: Partial<ObraResumo>): ObraResumo {
  return {
    obra_id: crypto.randomUUID(),
    codigo: "T",
    nome: "OBRA DE TESTE",
    situacao: "andamento",
    empresa_id: null,
    contratante_id: null,
    data_inicio: null,
    data_termino_prevista: null,
    data_termino_contratual_vigente: null,
    valor_contratado: 0,
    valor_medido: 0,
    valor_faturado: 0,
    valor_recebido: 0,
    saldo_a_medir: 0,
    pct_financeiro: null,
    pct_fisico_previsto: null,
    pct_fisico_realizado: null,
    data_avanco: null,
    desvio_fisico: null,
    dias_alem_do_prazo: null,
    ...campos,
  } as ObraResumo;
}

describe("indicadores do painel", () => {
  const hoje = "2026-11-03";

  it("carteira vazia não quebra e não inventa percentual", () => {
    const i = calcularIndicadores([], hoje);
    expect(i.total).toBe(0);
    expect(i.pctFinanceiroCarteira).toBeNull();
  });

  it("conta situação, atraso, proximidade da conclusão e soma valores", () => {
    const i = calcularIndicadores(
      [
        obra({ pct_fisico_realizado: 95, valor_contratado: 1000, valor_medido: 900 }),
        obra({ data_termino_contratual_vigente: "2026-11-20", valor_contratado: 1000, valor_medido: 100 }),
        obra({ dias_alem_do_prazo: 12 }),
        obra({ situacao: "planejamento" }),
        obra({ situacao: "cancelada", valor_contratado: 999999 }),
      ],
      hoje,
    );
    expect(i).toMatchObject({ total: 4, emAndamento: 3, emPlanejamento: 1, proximasDaConclusao: 2, comAtraso: 1 });
    expect(i.valorContratado).toBe(2000); // obra cancelada fora da carteira
    expect(i.pctFinanceiroCarteira).toBe(50);
  });
});

describe("navegação", () => {
  it("rotas únicas e módulo ativo por prefixo", () => {
    expect(new Set(MODULOS.map((m) => m.href)).size).toBe(MODULOS.length);
    expect(moduloAtivo("/")?.titulo).toBe("Painel");
    expect(moduloAtivo("/obras/123")?.slug).toBe("obras");
    expect(moduloAtivo("/inexistente")).toBeUndefined();
  });
});
