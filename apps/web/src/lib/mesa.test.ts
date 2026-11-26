import { describe, expect, it } from "vitest";
import { montarMesa, type DadosMesa } from "./mesa";

const base: DadosMesa = { hoje: "2026-11-26", empresaDaObra: { o1: "L7", o2: "CDN" }, decisoes: [], medicoesPendentes: [], aditivosPendentes: [], tarefasDelegadas: [], vencimentos: [], riscosCriticos: [], alertas: [] };
const todos = { empresas: null, obraId: null, area: null };
const dec = (x = {}) => ({ id: "d1", tipo: "decisao" as const, problema: "Segurar aço Ø80", area: "compras" as const, obra_id: "o2", empresa_id: null, recomendacao: "Segurar", prazo: "2026-11-30", adiar_ate: null, responsavel: null, ...x });

describe("caixa DECIDIR", () => {
  it("mostra decisão pendente com recomendação e empresa da obra", () => {
    const m = montarMesa({ ...base, decisoes: [dec()] }, todos);
    expect(m.decidir).toHaveLength(1);
    expect(m.decidir[0]).toMatchObject({ titulo: "Segurar aço Ø80", empresaId: "CDN", area: "compras", recomendacao: "Segurar", decisaoId: "d1" });
  });
  it("esconde decisão adiada até a data", () => {
    expect(montarMesa({ ...base, decisoes: [dec({ adiar_ate: "2026-12-01" })] }, todos).decidir).toHaveLength(0);
    expect(montarMesa({ ...base, decisoes: [dec({ adiar_ate: "2026-11-26" })] }, todos).decidir).toHaveLength(1);
  });
  it("aprovação vai para APROVAR", () => {
    const m = montarMesa({ ...base, decisoes: [dec({ tipo: "aprovacao" })] }, todos);
    expect(m.decidir).toHaveLength(0);
    expect(m.aprovar).toHaveLength(1);
  });
  it("ordena por prazo mais próximo", () => {
    const m = montarMesa({ ...base, decisoes: [dec({ id: "a", prazo: "2026-12-10" }), dec({ id: "b", prazo: "2026-11-27" })] }, todos);
    expect(m.decidir.map((i) => i.decisaoId)).toEqual(["b", "a"]);
  });
});

describe("caixa APROVAR", () => {
  it("inclui medições e aditivos pendentes como financeiro", () => {
    const m = montarMesa({ ...base, medicoesPendentes: [{ id: "m1", contrato_id: "c1", numero: "3", obra_id: "o1", situacao: "enviada", data_fim: "2026-11-20" }], aditivosPendentes: [{ id: "a1", contrato_id: "c1", numero: "1", obra_id: "o1" }] }, todos);
    expect(m.aprovar.map((i) => i.area)).toEqual(["financeiro", "financeiro"]);
  });
});

describe("caixa COBRAR", () => {
  it("entra tarefa vencida ou parada há 7 dias; não entra a em dia", () => {
    const t = (id: string, prazo: string | null, atualizado: string) => ({ id, titulo: id, obra_id: "o1", prazo, responsavel: "João", atualizado_em: atualizado });
    const m = montarMesa({ ...base, tarefasDelegadas: [t("vencida", "2026-11-20", "2026-11-25T10:00:00Z"), t("parada", null, "2026-11-18T10:00:00Z"), t("ok", "2026-12-05", "2026-11-25T10:00:00Z")] }, todos);
    expect(m.cobrar.map((i) => i.chave).sort()).toEqual(["tarefa:parada", "tarefa:vencida"]);
  });
});

describe("caixa ALERTAS e filtros", () => {
  it("vencimento em até 15 dias entra; além disso não", () => {
    const v = (data: string) => ({ registro_id: data, tipo: "marco", descricao: "x", obra_id: "o1", data });
    expect(montarMesa({ ...base, vencimentos: [v("2026-12-10"), v("2026-12-20")] }, todos).alertas).toHaveLength(1);
  });
  it("filtra por empresa e por área", () => {
    const d = { ...base, decisoes: [dec({ id: "x", obra_id: "o1", area: "obras" }), dec({ id: "y", obra_id: "o2" })] };
    expect(montarMesa(d, { empresas: ["L7"], obraId: null, area: null }).decidir.map((i) => i.decisaoId)).toEqual(["x"]);
    expect(montarMesa(d, { empresas: null, obraId: null, area: "compras" }).decidir.map((i) => i.decisaoId)).toEqual(["y"]);
  });
});

describe("ALERTAS sem repetição", () => {
  const alerta = (texto: string, grave = false) => ({ grupo: "Prazos" as const, grave, texto, href: "/planejamento" });
  it("tarefa e decisão não entram como vencimento", () => {
    const v = (tipo: string) => ({ registro_id: tipo, tipo, descricao: tipo, obra_id: "o1", data: "2026-11-28" });
    expect(montarMesa({ ...base, vencimentos: [v("tarefa"), v("decisao"), v("marco")] }, todos).alertas.map((i) => i.titulo)).toEqual(["marco"]);
  });
  it("junta marcos vencidos numa linha e descarta repetidos", () => {
    const m = montarMesa({ ...base, alertas: [
      alerta("Marco: A. Venceu em 10/11/2026.", true), alerta("Marco: B. Venceu em 12/11/2026.", true),
      alerta("Marco: C. Vence em 28/11/2026."), alerta("Decisão: X. Vence em 30/11/2026."),
      alerta("8 tarefas vencidas.", true), { grupo: "Equipe" as const, grave: false, texto: "5 cartões parados há 14 dias ou mais.", href: "/equipe" },
      { grupo: "Contratos" as const, grave: true, texto: "Contrato 1/2026: termina antes do cronograma.", href: "/contratos/c1" },
    ] }, todos);
    expect(m.alertas.map((i) => i.titulo).sort()).toEqual(["2 marcos vencidos no cronograma — revisar a programação", "Contrato 1/2026: termina antes do cronograma."]);
  });
});
