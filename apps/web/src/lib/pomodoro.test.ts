import { describe, expect, it } from "vitest";
import { ajustarDiaUtil, emSaoPaulo, horariosLivres, ocupadosNoDia, paraHora } from "./pomodoro";

const h = (lista: [number, number][]) => lista.map(([a, b]) => `${paraHora(a)}-${paraHora(b)}`);

describe("horário livre", () => {
  it("agenda vazia: começa às 08:00, em blocos seguidos", () => {
    expect(h(horariosLivres([], 30))).toEqual(["08:00-08:30", "08:30-09:00", "09:00-09:30"]);
  });

  it("pula compromissos sem sobrepor", () => {
    const ocupados: [number, number][] = [
      [8 * 60, 9 * 60 + 10],
      [9 * 60 + 30, 10 * 60],
    ];
    expect(h(horariosLivres(ocupados, 30))).toEqual(["10:00-10:30", "10:30-11:00", "11:00-11:30"]);
  });

  it("não marca no almoço nem depois das 16:00", () => {
    const manhaCheia: [number, number][] = [[8 * 60, 12 * 60]];
    expect(h(horariosLivres(manhaCheia, 40, null, 10)).at(0)).toBe("13:00-13:40");
    expect(h(horariosLivres(manhaCheia, 40, null, 10)).at(-1)).toBe("15:00-15:40");
    expect(horariosLivres([[13 * 60, 16 * 60], manhaCheia[0]], 30)).toEqual([]);
  });

  it("não sugere horário que já passou hoje", () => {
    expect(h(horariosLivres([], 30, 14 * 60 + 2, 1))).toEqual(["14:05-14:35"]);
  });

  it("bloco de 90 minutos não cabe num buraco de 60", () => {
    const ocupados: [number, number][] = [
      [8 * 60, 9 * 60],
      [10 * 60, 12 * 60],
    ];
    expect(h(horariosLivres(ocupados, 90, null, 1))).toEqual(["13:00-14:30"]);
  });
});

describe("compromissos do Google no dia", () => {
  it("converte para o horário de São Paulo e ignora dia inteiro", () => {
    const eventos = [
      { inicio: "2026-11-16T12:00:00.000Z", fim: "2026-11-16T13:30:00.000Z", dia_inteiro: false },
      { inicio: "2026-11-16T00:00:00-03:00", fim: "2026-11-17T00:00:00-03:00", dia_inteiro: true },
      { inicio: "2026-11-17T12:00:00.000Z", fim: "2026-11-17T13:00:00.000Z", dia_inteiro: false },
    ];
    expect(h(ocupadosNoDia(eventos, "2026-11-16"))).toEqual(["09:00-10:30"]);
  });

  it("instante em UTC vira a data civil de São Paulo", () => {
    expect(emSaoPaulo("2026-11-17T01:30:00.000Z")).toEqual({ data: "2026-11-16", minuto: 22 * 60 + 30 });
  });
});

describe("dia útil", () => {
  it("sábado e domingo voltam para a sexta", () => {
    expect(ajustarDiaUtil("2026-11-21", "2026-11-13")).toBe("2026-11-20");
    expect(ajustarDiaUtil("2026-11-22", "2026-11-13")).toBe("2026-11-20");
  });
  it("se a sexta já passou, vai para o próximo dia útil", () => {
    expect(ajustarDiaUtil("2026-11-15", "2026-11-14")).toBe("2026-11-16");
  });
  it("dia útil fica como está", () => {
    expect(ajustarDiaUtil("2026-11-18", "2026-11-13")).toBe("2026-11-18");
  });
});
