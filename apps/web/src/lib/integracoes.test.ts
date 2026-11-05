import { describe, expect, it } from "vitest";
import { alertasConectores, estaPausado } from "./integracoes";
import { demandaNotionSchema, validar } from "./validacao";

const agora = new Date("2026-11-05T12:00:00Z");
const conector = (extra = {}) => ({ nome_exibicao: "Trello", ativo: true, estado_conexao: "conectado", ultima_sync_em: "2026-11-05T11:30:00Z", intervalo_minutos: 60, pausado_ate: null, ...extra });

describe("alertasConectores", () => {
  it("conector em dia não gera alerta", () => {
    expect(alertasConectores([conector()], agora)).toEqual([]);
  });

  it("avisa erro e erro de autorização", () => {
    expect(alertasConectores([conector({ estado_conexao: "erro" }), conector({ estado_conexao: "erro_autenticacao" })], agora)).toHaveLength(2);
  });

  it("de hora em hora, tolera até 3 horas", () => {
    expect(alertasConectores([conector({ ultima_sync_em: "2026-11-05T09:30:00Z" })], agora)).toEqual([]);
    expect(alertasConectores([conector({ ultima_sync_em: "2026-11-05T08:30:00Z" })], agora)).toHaveLength(1);
  });

  it("rotina semanal tolera 20% a mais", () => {
    const semanal = { intervalo_minutos: 10080 };
    expect(alertasConectores([conector({ ...semanal, ultima_sync_em: "2026-10-29T12:00:00Z" })], agora)).toEqual([]);
    expect(alertasConectores([conector({ ...semanal, ultima_sync_em: "2026-10-25T12:00:00Z" })], agora)).toHaveLength(1);
  });

  it("pausado ou inativo não gera alerta", () => {
    expect(alertasConectores([conector({ estado_conexao: "erro", pausado_ate: "2100-01-01T00:00:00Z" }), conector({ estado_conexao: "erro", ativo: false })], agora)).toEqual([]);
  });
});

describe("estaPausado", () => {
  it("só com data futura", () => {
    expect(estaPausado({ pausado_ate: "2100-01-01T00:00:00Z" }, agora)).toBe(true);
    expect(estaPausado({ pausado_ate: "2026-01-01T00:00:00Z" }, agora)).toBe(false);
    expect(estaPausado({ pausado_ate: null }, agora)).toBe(false);
  });
});

describe("demanda no Notion", () => {
  it("exige título e aceita só prioridades e categorias da base", () => {
    expect(validar(demandaNotionSchema, { titulo: "Revisar contrato", prioridade: "🟠 Alta", categoria: "Obras" }).erros).toBeNull();
    expect(validar(demandaNotionSchema, { titulo: "", prioridade: "🟠 Alta", categoria: "Obras" }).erros?.titulo).toBeTruthy();
    expect(validar(demandaNotionSchema, { titulo: "x", prioridade: "Inventada", categoria: "Obras" }).erros?.prioridade).toBeTruthy();
  });
});
