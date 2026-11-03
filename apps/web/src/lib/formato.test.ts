import { describe, expect, it } from "vitest";
import { brl, dataCivil, dataHora, hojeSP, limitesDoDiaSP, pct, somarDias } from "./formato";

const espaco = /\s/g; // Intl usa espaço não separável entre "R$" e o número

describe("formatação pt-BR", () => {
  it("moeda em reais", () => {
    expect(brl(1234567.89).replace(espaco, " ")).toBe("R$ 1.234.567,89");
    expect(brl(null)).toBe("—");
    expect(brl(2650000, true).replace(espaco, " ")).toMatch(/^R\$ 2,7 mi/);
  });

  it("percentual", () => {
    expect(pct(45.678)).toBe("45,7%");
    expect(pct(null)).toBe("—");
  });

  it("data civil não desloca o dia por fuso", () => {
    expect(dataCivil("2026-11-03")).toBe("03/11/2026");
    expect(dataCivil(null)).toBe("—");
  });

  it("instante exibido no horário de São Paulo", () => {
    expect(dataHora("2026-11-04T02:30:00Z")).toBe("03/11/2026, 23:30");
  });

  it("'hoje' segue São Paulo, não UTC", () => {
    expect(hojeSP(new Date("2026-11-04T02:30:00Z"))).toBe("2026-11-03");
  });

  it("somar dias atravessa meses e anos", () => {
    expect(somarDias("2026-12-30", 3)).toBe("2027-01-02");
    expect(limitesDoDiaSP("2026-11-03")).toEqual({ inicio: "2026-11-03T00:00:00-03:00", fim: "2026-11-03T23:59:59.999-03:00" });
  });
});
