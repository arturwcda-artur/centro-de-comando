import { describe, expect, it } from "vitest";
import { instanteSP, janelaAnterior, janelaDe, lerJanela, periodosParaFechar, podeFechar, rotuloDaJanela } from "./placar";

describe("períodos do calendário (RN-49p)", () => {
  it("semana vai de segunda a domingo", () => {
    expect(janelaDe("semana", "2026-11-27")).toEqual({ tipo: "semana", inicio: "2026-11-23", fim: "2026-11-30" });
    expect(janelaDe("semana", "2026-11-30")).toEqual({ tipo: "semana", inicio: "2026-11-30", fim: "2026-12-07" });
    expect(rotuloDaJanela(janelaDe("semana", "2026-11-27"))).toBe("Semana de 23/11 a 29/11");
  });

  it("mês é o do calendário, inclusive na virada do ano", () => {
    expect(janelaDe("mes", "2026-11-27")).toEqual({ tipo: "mes", inicio: "2026-11-01", fim: "2026-12-01" });
    expect(janelaDe("mes", "2026-12-15").fim).toBe("2027-01-01");
    expect(rotuloDaJanela(janelaDe("mes", "2026-11-27"))).toBe("Novembro/2026");
    expect(janelaAnterior(janelaDe("mes", "2026-11-27"))).toEqual({ tipo: "mes", inicio: "2026-10-01", fim: "2026-11-01" });
  });

  it("só fecha depois do fim mais um dia de folga", () => {
    const novembro = janelaDe("mes", "2026-11-10");
    expect(podeFechar(novembro, "2026-12-01")).toBe(false);
    expect(podeFechar(novembro, "2026-12-02")).toBe(true);
    expect(periodosParaFechar("mes", "2026-11-27")).toEqual([]);
    expect(periodosParaFechar("mes", "2027-01-05").map((j) => j.inicio)).toEqual(["2026-11-01", "2026-12-01"]);
    expect(periodosParaFechar("semana", "2026-12-09").map((j) => j.inicio)).toEqual(["2026-11-23", "2026-11-30"]);
  });

  it("lê o período da tela; data futura ou inválida vira hoje", () => {
    expect(lerJanela(undefined, undefined, "2026-11-27").inicio).toBe("2026-11-01");
    expect(lerJanela("semana", "2026-11-18", "2026-11-27").inicio).toBe("2026-11-16");
    expect(lerJanela("semana", "2027-01-01", "2026-11-27").inicio).toBe("2026-11-23");
    expect(lerJanela("todos", null, "2026-11-27")).toEqual({ tipo: "todos", inicio: null, fim: null });
  });

  it("o dia começa à meia-noite de São Paulo", () => {
    expect(instanteSP("2026-11-30")).toBe("2026-11-30T03:00:00");
    // domingo 22h em Brasília ainda é da semana que termina
    expect("2026-11-30T01:00:00+00:00" < instanteSP("2026-11-30")!).toBe(true);
  });
});
