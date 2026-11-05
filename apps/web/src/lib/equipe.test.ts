import { describe, expect, it } from "vitest";
import { QUADRO_EQUIPE, SEM_RESPONSAVEL, resumirEquipe, tituloDoComentario, type CartaoEquipe } from "./equipe";

const hoje = "2026-11-05";
const cartao = (extra: Partial<CartaoEquipe> = {}): CartaoEquipe => ({ status: "a_fazer", prazo: null, concluida_em: null, categoria: `${QUADRO_EQUIPE} › CEF-01`, membros: ["Ana"], ...extra });
const concluido = (extra: Partial<CartaoEquipe> = {}) => cartao({ status: "concluida", concluida_em: "2026-11-01T12:00:00Z", ...extra });

describe("resumirEquipe", () => {
  it("conta atribuídas, abertas, concluídas, vencidas e percentual", () => {
    const r = resumirEquipe([cartao(), cartao({ prazo: "2026-11-01" }), concluido(), concluido({ prazo: "2026-10-01" })], hoje);
    expect(r.porResponsavel[0]).toEqual({ nome: "Ana", atribuidas: 4, abertas: 2, concluidas: 2, vencidas: 1, percentual: 50 });
    expect(r.total?.atribuidas).toBe(4);
  });

  it("agrupa por lista dentro do quadro", () => {
    const r = resumirEquipe([cartao(), cartao({ categoria: `${QUADRO_EQUIPE} › CEF-02` })], hoje);
    expect(r.porLista.map((l) => l.nome).sort()).toEqual(["CEF-01", "CEF-02"]);
  });

  it("cartão com dois membros conta para os dois, e uma vez no total", () => {
    const r = resumirEquipe([cartao({ membros: ["Ana", "Bia"] })], hoje);
    expect(r.porResponsavel.map((l) => l.nome)).toEqual(["Ana", "Bia"]);
    expect(r.total?.atribuidas).toBe(1);
  });

  it("cartão sem membro aparece como sem responsável", () => {
    expect(resumirEquipe([cartao({ membros: [] })], hoje).porResponsavel[0].nome).toBe(SEM_RESPONSAVEL);
  });

  it("cancelados não contam", () => {
    expect(resumirEquipe([cartao({ status: "cancelada" })], hoje).total).toBeNull();
  });

  it("no período, tira concluídos antigos e mantém os abertos", () => {
    const r = resumirEquipe([cartao(), concluido({ concluida_em: "2026-01-01T12:00:00Z" }), concluido()], hoje, "2026-10-06");
    expect(r.total).toMatchObject({ atribuidas: 2, abertas: 1, concluidas: 1 });
  });

  it("cartão vencido concluído não conta como vencido", () => {
    expect(resumirEquipe([concluido({ prazo: "2026-01-01" })], hoje).total?.vencidas).toBe(0);
  });
});

describe("tituloDoComentario", () => {
  it("usa a primeira linha e limita o tamanho", () => {
    expect(tituloDoComentario("  Trocar fôrma\nDetalhe")).toBe("Trocar fôrma");
    expect(tituloDoComentario("x".repeat(100))).toHaveLength(80);
  });
});
