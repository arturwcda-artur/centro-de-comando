import { describe, expect, it } from "vitest";
import { QUADRO_EQUIPE, SEM_RESPONSAVEL, resumirEquipe, tituloDoComentario, type CartaoEquipe } from "./equipe";

const hoje = "2026-11-05";
const cartao = (extra: Partial<CartaoEquipe> = {}): CartaoEquipe => ({ status: "a_fazer", prazo: null, concluido_em: null, criado_em: "2026-10-01T12:00:00Z", prazo_original: null, prazo_alteracoes: 0, categoria: `${QUADRO_EQUIPE} › CEF-01`, membros: ["Ana"], ...extra });
const concluido = (extra: Partial<CartaoEquipe> = {}) => cartao({ status: "concluida", concluido_em: "2026-10-11T12:00:00Z", ...extra });

describe("contagens", () => {
  it("conta atribuídas, abertas, concluídas e vencidas", () => {
    const r = resumirEquipe([cartao(), cartao({ prazo: "2026-11-01" }), concluido(), concluido({ prazo: "2026-10-01" })], hoje);
    expect(r.porResponsavel[0]).toMatchObject({ nome: "Ana", atribuidas: 4, abertas: 2, concluidas: 2, vencidas: 1 });
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
    const r = resumirEquipe([cartao(), concluido({ concluido_em: "2026-01-01T12:00:00Z" }), concluido()], hoje, "2026-10-06");
    expect(r.total).toMatchObject({ atribuidas: 2, abertas: 1, concluidas: 1 });
  });
});

describe("taxa de eficiência", () => {
  const eficiencia = (lista: CartaoEquipe[]) => resumirEquipe(lista, hoje).total;

  it("concluído até o prazo conta a favor; depois, contra", () => {
    expect(eficiencia([concluido({ prazo: "2026-10-11" }), concluido({ prazo: "2026-10-10" })])).toMatchObject({ noPrazo: 1, cobraveis: 2, eficiencia: 50 });
  });

  it("vencido em aberto conta contra", () => {
    expect(eficiencia([concluido({ prazo: "2026-10-20" }), cartao({ prazo: "2026-11-01" })])).toMatchObject({ noPrazo: 1, cobraveis: 2, eficiencia: 50 });
  });

  it("aberto com prazo futuro ainda não conta", () => {
    expect(eficiencia([cartao({ prazo: "2026-12-01" })])).toMatchObject({ cobraveis: 0, eficiencia: null });
  });

  it("prazo de hoje ainda não é vencido", () => {
    expect(eficiencia([cartao({ prazo: hoje })])?.cobraveis).toBe(0);
  });

  it("sem prazo, não entra na taxa", () => {
    expect(eficiencia([concluido()])).toMatchObject({ cobraveis: 0, eficiencia: null });
  });

  it("conclusão à noite em São Paulo vale para o dia civil de lá", () => {
    expect(eficiencia([concluido({ prazo: "2026-10-11", concluido_em: "2026-10-12T02:00:00Z" })])?.noPrazo).toBe(1);
  });
});

describe("mudança da data de entrega", () => {
  const total = (lista: CartaoEquipe[]) => resumirEquipe(lista, hoje).total;

  it("adiar o prazo não melhora a taxa: vale a data original", () => {
    expect(total([concluido({ prazo: "2026-10-30", prazo_original: "2026-10-05", prazo_alteracoes: 1 })])).toMatchObject({ noPrazo: 0, cobraveis: 1, eficiencia: 0 });
  });

  it("cartão aberto com data original vencida conta contra, mesmo adiado para o futuro", () => {
    const r = total([cartao({ prazo: "2026-12-01", prazo_original: "2026-10-05", prazo_alteracoes: 1 })]);
    expect(r).toMatchObject({ cobraveis: 1, eficiencia: 0, vencidas: 0 });
  });

  it("soma as mudanças de data", () => {
    expect(total([cartao({ prazo_alteracoes: 2 }), cartao({ prazo_alteracoes: 1 })])?.prazosAlterados).toBe(3);
  });

  it("data retirada continua cobrada pela original", () => {
    expect(total([concluido({ prazo: null, prazo_original: "2026-10-20", prazo_alteracoes: 1 })])).toMatchObject({ noPrazo: 1, cobraveis: 1 });
  });
});

describe("ranking", () => {
  const noPrazo = (membro: string) => concluido({ prazo: "2026-10-20", membros: [membro] });
  const atrasado = (membro: string) => concluido({ prazo: "2026-10-01", membros: [membro] });

  it("ordena pela maior eficiência e numera as posições", () => {
    const r = resumirEquipe([atrasado("Ana"), noPrazo("Bia"), noPrazo("Caio"), atrasado("Caio")], hoje).porResponsavel;
    expect(r.map((l) => [l.posicao, l.nome])).toEqual([[1, "Bia"], [2, "Caio"], [3, "Ana"]]);
  });

  it("no empate, fica à frente quem tem mais cartões cobráveis", () => {
    const r = resumirEquipe([noPrazo("Ana"), noPrazo("Bia"), noPrazo("Bia")], hoje).porResponsavel;
    expect(r[0].nome).toBe("Bia");
  });

  it("sem cartão cobrável, fica no fim e sem posição", () => {
    const r = resumirEquipe([cartao({ membros: ["Ana"] }), atrasado("Bia")], hoje).porResponsavel;
    expect(r.map((l) => [l.nome, l.posicao])).toEqual([["Bia", 1], ["Ana", null]]);
  });

  it("sem responsável não entra na numeração", () => {
    const r = resumirEquipe([noPrazo("Ana"), concluido({ prazo: "2026-10-20", membros: [] })], hoje).porResponsavel;
    expect(r.find((l) => l.nome === SEM_RESPONSAVEL)?.posicao).toBeNull();
    expect(r.find((l) => l.nome === "Ana")?.posicao).toBe(1);
  });
});

describe("cartões de rotina", () => {
  const item = (extra = {}) => ({ criado_em: "2026-10-01T12:00:00Z", concluido_em: "2026-10-03T12:00:00Z", responsaveis: ["Ana"], categoria: `${QUADRO_EQUIPE} › CEF-01`, ...extra });

  it("saem das contagens e da taxa, mesmo com prazo vencido", () => {
    const r = resumirEquipe([cartao({ rotina: true, prazo: "2026-01-01" }), concluido({ prazo: "2026-10-20" })], hoje).total;
    expect(r).toMatchObject({ atribuidas: 1, abertas: 0, cobraveis: 1, eficiencia: 100 });
  });

  it("contam pelos itens concluídos, com o tempo médio por item", () => {
    const r = resumirEquipe([], hoje, undefined, [item(), item({ concluido_em: "2026-10-05T12:00:00Z" })]).porResponsavel[0];
    expect(r).toMatchObject({ nome: "Ana", itensRotina: 2, diasPorItem: 3, atribuidas: 0 });
  });

  it("quem só tem rotina aparece, mas sem posição no ranking", () => {
    const r = resumirEquipe([], hoje, undefined, [item()]).porResponsavel[0];
    expect(r.posicao).toBeNull();
  });

  it("item com dois responsáveis credita os dois; sem nenhum, fica sem responsável", () => {
    const r = resumirEquipe([], hoje, undefined, [item({ responsaveis: ["Ana", "Bia"] }), item({ responsaveis: [] })]);
    expect(r.porResponsavel.map((l) => l.nome).sort()).toEqual(["Ana", "Bia", SEM_RESPONSAVEL]);
    expect(r.total?.itensRotina).toBe(2);
  });

  it("no período, tira itens antigos", () => {
    const r = resumirEquipe([], hoje, "2026-10-06", [item(), item({ concluido_em: "2026-11-01T12:00:00Z" })]).total;
    expect(r?.itensRotina).toBe(1);
  });

  it("item sem data de conclusão conta em todo o período e não entra no tempo", () => {
    const r = resumirEquipe([], hoje, undefined, [item({ concluido_em: null })]).total;
    expect(r).toMatchObject({ itensRotina: 1, diasPorItem: null });
  });
});

describe("tempo médio", () => {
  it("vai da criação à conclusão, em dias", () => {
    const r = resumirEquipe([concluido(), concluido({ concluido_em: "2026-10-21T12:00:00Z" })], hoje);
    expect(r.total?.diasMedios).toBe(15);
  });

  it("sem concluídos, não há tempo médio", () => {
    expect(resumirEquipe([cartao()], hoje).total?.diasMedios).toBeNull();
  });
});

describe("tituloDoComentario", () => {
  it("usa a primeira linha e limita o tamanho", () => {
    expect(tituloDoComentario("  Trocar fôrma\nDetalhe")).toBe("Trocar fôrma");
    expect(tituloDoComentario("x".repeat(100))).toHaveLength(80);
  });
});
