import { describe, expect, it } from "vitest";
import { QUADRO_EQUIPE, SEM_RESPONSAVEL, entregasPorSemana, resumirEquipe, tituloDoComentario, type CartaoEquipe, type ItemCartao } from "./equipe";

const hoje = "2026-11-05";
const cartao = (extra: Partial<CartaoEquipe> = {}): CartaoEquipe => ({ status: "a_fazer", prazo: null, concluido_em: null, criado_em: "2026-10-01T12:00:00Z", prazo_original: null, prazo_alteracoes: 0, categoria: `${QUADRO_EQUIPE} › CEF-01`, membros: ["Ana"], ...extra });
const concluido = (extra: Partial<CartaoEquipe> = {}) => cartao({ status: "concluida", concluido_em: "2026-10-11T12:00:00Z", ...extra });
const item = (extra: Partial<ItemCartao> = {}): ItemCartao => ({ concluido: true, criado_em: "2026-10-01T12:00:00Z", concluido_em: "2026-10-03T12:00:00Z", responsaveis: [], ...extra });
const pendente = (extra: Partial<ItemCartao> = {}) => item({ concluido: false, concluido_em: null, ...extra });

describe("contagem de tarefas", () => {
  it("cartão sem checklist vale 1", () => {
    expect(resumirEquipe([cartao(), concluido()], hoje).total).toMatchObject({ sobResponsabilidade: 2, resolvidas: 1, pendentes: 1, resolucao: 50 });
  });

  it("cartão com checklist vale pelos itens, e não soma mais 1", () => {
    expect(resumirEquipe([cartao({ itens: [item(), item(), pendente()] })], hoje).total).toMatchObject({ sobResponsabilidade: 3, resolvidas: 2, pendentes: 1, itensResolvidos: 2 });
  });

  it("soma cartões com e sem checklist", () => {
    expect(resumirEquipe([concluido(), cartao({ itens: [item(), pendente()] })], hoje).total).toMatchObject({ sobResponsabilidade: 3, resolvidas: 2 });
  });

  it("cartão concluído resolve todos os itens, mesmo os não marcados", () => {
    expect(resumirEquipe([concluido({ itens: [item(), pendente()] })], hoje).total).toMatchObject({ resolvidas: 2, pendentes: 0 });
  });

  it("agrupa por lista dentro do quadro", () => {
    const r = resumirEquipe([cartao(), cartao({ categoria: `${QUADRO_EQUIPE} › CEF-02` })], hoje);
    expect(r.porLista.map((l) => l.nome).sort()).toEqual(["CEF-01", "CEF-02"]);
  });

  it("tarefa com dois membros vale metade para cada um, e 1 no total", () => {
    const r = resumirEquipe([cartao({ membros: ["Ana", "Bia"] })], hoje);
    expect(r.porResponsavel.map((l) => [l.nome, l.sobResponsabilidade])).toEqual([["Ana", 0.5], ["Bia", 0.5]]);
    expect(r.total?.sobResponsabilidade).toBe(1);
  });

  it("a soma das pessoas bate com o total", () => {
    const r = resumirEquipe([cartao({ membros: ["Ana", "Bia", "Caio"], itens: [pendente(), pendente(), pendente()] }), concluido({ membros: ["Ana", "Bia"] })], hoje);
    expect(r.porResponsavel.reduce((s, l) => s + l.sobResponsabilidade, 0)).toBeCloseTo(r.total?.sobResponsabilidade ?? 0);
  });

  it("um cartão com 15 itens e 3 membros não vale 45", () => {
    const r = resumirEquipe([concluido({ membros: ["Ana", "Bia", "Caio"], itens: Array.from({ length: 15 }, () => pendente()) })], hoje);
    expect(r.porResponsavel[0].resolvidas).toBeCloseTo(5);
    expect(r.total?.resolvidas).toBe(15);
  });

  it("sem membro aparece como sem responsável", () => {
    expect(resumirEquipe([cartao({ membros: [] })], hoje).porResponsavel[0].nome).toBe(SEM_RESPONSAVEL);
  });

  it("cancelados não contam", () => {
    expect(resumirEquipe([cartao({ status: "cancelada", itens: [item()] })], hoje).total).toBeNull();
  });
});

describe("crédito pelos responsáveis, se a regra for desligada", () => {
  it("vai para o responsável pelo cartão, mesmo que outra pessoa tenha marcado", () => {
    const r = resumirEquipe([cartao({ membros: ["Ana"], itens: [item({ resolvido_por: "Bia", responsaveis: ["Caio"] })] })], hoje, undefined, false).porResponsavel;
    expect(r.map((l) => [l.nome, l.resolvidas])).toEqual([["Ana", 1]]);
  });
});

describe("crédito do cartão", () => {
  it("cartão sem checklist é dos responsáveis, dividido entre eles", () => {
    const r = resumirEquipe([concluido({ membros: ["Ana", "Bia"] })], hoje).porResponsavel;
    expect(r.map((l) => l.resolvidas)).toEqual([0.5, 0.5]);
  });

  it("item não marcado de cartão concluído é dos responsáveis do cartão", () => {
    const r = resumirEquipe([concluido({ membros: ["Ana"], itens: [pendente()] })], hoje).porResponsavel;
    expect(r[0]).toMatchObject({ nome: "Ana", resolvidas: 1 });
  });

  it("Concluídas e Entregas batem para quem só tem cartões sem checklist", () => {
    const r = resumirEquipe([concluido(), concluido()], hoje).porResponsavel[0];
    expect(r).toMatchObject({ concluidas: 2, resolvidas: 2 });
  });
});

describe("sem responsável", () => {
  const semDono = (extra = {}) => cartao({ membros: [], ...extra });

  it("não entra no total nem nas listas", () => {
    const r = resumirEquipe([concluido(), semDono(), semDono({ itens: [pendente(), pendente()] })], hoje);
    expect(r.total).toMatchObject({ sobResponsabilidade: 1, resolvidas: 1, resolucao: 100 });
    expect(r.porLista[0].sobResponsabilidade).toBe(1);
  });

  it("não entra na eficiência no prazo geral", () => {
    const r = resumirEquipe([concluido({ prazo: "2026-10-20" }), semDono({ prazo: "2026-01-01" })], hoje).total;
    expect(r).toMatchObject({ cobraveis: 1, eficiencia: 100, vencidas: 0 });
  });

  it("fica no fim, mesmo com mais entregas", () => {
    const r = resumirEquipe([cartao(), concluido({ membros: [] })], hoje).porResponsavel;
    expect(r.map((l) => l.nome)).toEqual(["Ana", SEM_RESPONSAVEL]);
  });
});

describe("crédito do item por quem marcou", () => {
  // O membro do cartão pode aparecer zerado: ele continua respondendo pelo prazo do cartão
  const porPessoa = (c: CartaoEquipe) => Object.fromEntries(resumirEquipe([c], hoje).porResponsavel.filter((l) => l.sobResponsabilidade > 0).map((l) => [l.nome, [l.resolvidas, l.pendentes]]));

  it("vai para quem marcou, não para o membro do cartão", () => {
    expect(porPessoa(cartao({ membros: ["Ana"], itens: [item({ resolvido_por: "Bia" })] }))).toEqual({ Bia: [1, 0] });
  });

  it("vale mesmo com outro membro atribuído ao item", () => {
    expect(porPessoa(cartao({ itens: [item({ resolvido_por: "Bia", responsaveis: ["Caio"] })] }))).toEqual({ Bia: [1, 0] });
  });

  it("sem registro de quem marcou, fica com o membro do item e depois com os do cartão", () => {
    expect(porPessoa(cartao({ membros: ["Ana"], itens: [item({ responsaveis: ["Bia"] }), item()] }))).toEqual({ Ana: [1, 0], Bia: [1, 0] });
  });

  it("item pendente segue com o responsável, sem ninguém ter marcado", () => {
    expect(porPessoa(cartao({ membros: ["Ana"], itens: [pendente()] }))).toEqual({ Ana: [0, 1] });
  });

  it("dois membros no cartão não dobram o crédito do item marcado", () => {
    expect(porPessoa(cartao({ membros: ["Ana", "Bia"], itens: [item({ resolvido_por: "Ana" })] }))).toEqual({ Ana: [1, 0] });
  });
});

describe("período", () => {
  it("tira resolvidas antigas e mantém as pendentes", () => {
    const r = resumirEquipe([cartao(), concluido({ concluido_em: "2026-01-01T12:00:00Z" }), concluido()], hoje, "2026-10-06").total;
    expect(r).toMatchObject({ sobResponsabilidade: 2, resolvidas: 1, pendentes: 1 });
  });

  it("vale também para itens", () => {
    const r = resumirEquipe([cartao({ itens: [item(), item({ concluido_em: "2026-11-01T12:00:00Z" }), pendente()] })], hoje, "2026-10-06").total;
    expect(r).toMatchObject({ resolvidas: 1, pendentes: 1 });
  });

  it("item sem data usa a do cartão concluído", () => {
    expect(resumirEquipe([concluido({ concluido_em: "2026-01-01T12:00:00Z", itens: [pendente()] })], hoje, "2026-10-06").total).toBeNull();
  });
});

describe("eficiência no prazo", () => {
  const total = (lista: CartaoEquipe[]) => resumirEquipe(lista, hoje).total;

  it("concluído até o prazo conta a favor; depois, contra", () => {
    expect(total([concluido({ prazo: "2026-10-11" }), concluido({ prazo: "2026-10-10" })])).toMatchObject({ noPrazo: 1, cobraveis: 2, eficiencia: 50 });
  });

  it("vencido em aberto conta contra", () => {
    expect(total([concluido({ prazo: "2026-10-20" }), cartao({ prazo: "2026-11-01" })])).toMatchObject({ noPrazo: 1, cobraveis: 2, vencidas: 1 });
  });

  it("saldo é no prazo menos atrasados", () => {
    expect(total([concluido({ prazo: "2026-10-20" }), concluido({ prazo: "2026-10-21" }), concluido({ prazo: "2026-10-01" })])?.saldoPrazo).toBe(1);
    expect(total([concluido({ prazo: "2026-10-01" }), cartao({ prazo: "2026-11-01" })])?.saldoPrazo).toBe(-2);
  });

  it("sem cartão cobrável, não há saldo", () => {
    expect(total([cartao()])?.saldoPrazo).toBeNull();
  });

  it("aberto com prazo futuro ainda não conta, nem o de hoje", () => {
    expect(total([cartao({ prazo: "2026-12-01" }), cartao({ prazo: hoje })])).toMatchObject({ cobraveis: 0, eficiencia: null });
  });

  it("sem prazo, não entra na taxa", () => {
    expect(total([concluido()])).toMatchObject({ cobraveis: 0, eficiencia: null });
  });

  it("conclusão à noite em São Paulo vale para o dia civil de lá", () => {
    expect(total([concluido({ prazo: "2026-10-11", concluido_em: "2026-10-12T02:00:00Z" })])?.noPrazo).toBe(1);
  });

  it("o prazo conta o cartão uma vez, mesmo com vários itens", () => {
    expect(total([concluido({ prazo: "2026-10-20", itens: [item(), item(), item()] })])).toMatchObject({ cobraveis: 1, sobResponsabilidade: 3 });
  });

  it("adiar o prazo não melhora a taxa: vale a data original", () => {
    expect(total([concluido({ prazo: "2026-10-30", prazo_original: "2026-10-05", prazo_alteracoes: 1 })])).toMatchObject({ noPrazo: 0, cobraveis: 1, eficiencia: 0 });
  });

  it("cartão aberto com data original vencida conta contra, mesmo adiado", () => {
    expect(total([cartao({ prazo: "2026-12-01", prazo_original: "2026-10-05", prazo_alteracoes: 1 })])).toMatchObject({ cobraveis: 1, eficiencia: 0, vencidas: 0 });
  });

  it("soma as mudanças de data", () => {
    expect(total([cartao({ prazo_alteracoes: 2 }), cartao({ prazo_alteracoes: 1 })])?.prazosAlterados).toBe(3);
  });

  it("data retirada continua cobrada pela original", () => {
    expect(total([concluido({ prazo: null, prazo_original: "2026-10-20", prazo_alteracoes: 1 })])).toMatchObject({ noPrazo: 1, cobraveis: 1 });
  });
});

describe("cartão de rotina", () => {
  it("fica fora da eficiência no prazo, mas seus itens contam", () => {
    const r = resumirEquipe([cartao({ rotina: true, prazo: "2026-01-01", itens: [item(), pendente()] })], hoje).total;
    expect(r).toMatchObject({ cobraveis: 0, vencidas: 0, sobResponsabilidade: 2, resolvidas: 1 });
  });

  it("sem checklist, vale 1 como os outros", () => {
    expect(resumirEquipe([cartao({ rotina: true })], hoje).total?.sobResponsabilidade).toBe(1);
  });
});

describe("cartões e entregas", () => {
  it("mostra os cartões e, à parte, os itens resolvidos", () => {
    const r = resumirEquipe([cartao({ membros: ["Ana"], itens: [item({ resolvido_por: "Ana" }), item({ resolvido_por: "Ana" }), pendente()] }), concluido({ membros: ["Ana"] })], hoje).porResponsavel[0];
    expect(r).toMatchObject({ atribuidas: 2, abertas: 1, concluidas: 1, itensResolvidos: 2, resolvidas: 3 });
  });

  it("quem resolve itens em cartão de rotina aparece com as entregas, sem cartões", () => {
    const r = resumirEquipe([cartao({ rotina: true, membros: ["Ana"], itens: [item({ resolvido_por: "Bia" })] })], hoje).porResponsavel;
    expect(r.find((l) => l.nome === "Bia")).toMatchObject({ atribuidas: 0, itensResolvidos: 1, resolvidas: 1 });
  });
});

describe("ordem do painel", () => {
  const aberto = (membro: string) => cartao({ membros: [membro] });
  const feito = (membro: string) => concluido({ membros: [membro] });

  it("ordena por entregas: ter mais tarefas pendentes não prejudica", () => {
    const r = resumirEquipe([feito("Pedro"), feito("Pedro"), aberto("Pedro"), aberto("Pedro"), aberto("Pedro"), feito("Ana")], hoje).porResponsavel;
    expect(r.map((l) => l.nome)).toEqual(["Pedro", "Ana"]);
  });

  it("no empate, vem primeiro quem carrega mais pendências", () => {
    expect(resumirEquipe([feito("Ana"), feito("Bia"), aberto("Bia")], hoje).porResponsavel[0].nome).toBe("Bia");
  });

  it("não tem posição", () => {
    expect(resumirEquipe([feito("Ana")], hoje).porResponsavel[0]).not.toHaveProperty("posicao");
  });
});

describe("período anterior", () => {
  it("com data final, conta só o intervalo", () => {
    const lista = [concluido({ concluido_em: "2026-10-02T12:00:00Z" }), concluido({ concluido_em: "2026-10-20T12:00:00Z" })];
    expect(resumirEquipe(lista, hoje, "2026-10-01", undefined, "2026-10-10").total?.resolvidas).toBe(1);
  });
});

describe("entregas por semana", () => {
  it("agrupa de segunda a domingo e termina na semana atual", () => {
    const r = entregasPorSemana([concluido({ concluido_em: "2026-11-02T12:00:00Z" }), concluido({ concluido_em: "2026-11-05T12:00:00Z" }), concluido({ concluido_em: "2026-11-01T12:00:00Z" })], hoje, 2);
    expect(r).toEqual([{ inicio: "2026-10-26", entregas: 1 }, { inicio: "2026-11-02", entregas: 2 }]);
  });

  it("cartão com checklist conta pelos itens", () => {
    const r = entregasPorSemana([cartao({ itens: [item({ concluido_em: "2026-11-03T12:00:00Z" }), item({ concluido_em: "2026-11-03T12:00:00Z" }), pendente()] })], hoje, 1);
    expect(r[0].entregas).toBe(2);
  });

  it("não conta cancelados, abertos nem tarefas sem responsável", () => {
    const r = entregasPorSemana([cartao(), concluido({ status: "cancelada", concluido_em: "2026-11-03T12:00:00Z" }), concluido({ membros: [], concluido_em: "2026-11-03T12:00:00Z" })], hoje, 1);
    expect(r[0].entregas).toBe(0);
  });
});

describe("tempos", () => {
  it("tempo por tarefa junta itens e cartões sem checklist", () => {
    const r = resumirEquipe([concluido(), cartao({ itens: [item()] })], hoje).total;
    expect(r?.diasPorTarefa).toBe(6);
  });

  it("com dois responsáveis, cada um recebe o tempo da tarefa", () => {
    const r = resumirEquipe([concluido({ membros: ["Ana", "Bia"] })], hoje).porResponsavel;
    expect(r.map((l) => l.diasPorTarefa)).toEqual([10, 10]);
  });

  it("tempo médio vai da criação à conclusão do cartão", () => {
    expect(resumirEquipe([concluido(), concluido({ concluido_em: "2026-10-21T12:00:00Z" })], hoje).total?.diasMedios).toBe(15);
  });

  it("tempo por item considera só os resolvidos", () => {
    expect(resumirEquipe([cartao({ itens: [item(), item({ concluido_em: "2026-10-05T12:00:00Z" }), pendente()] })], hoje).total?.diasPorItem).toBe(3);
  });

  it("sem concluídos, não há tempo", () => {
    expect(resumirEquipe([cartao()], hoje).total).toMatchObject({ diasMedios: null, diasPorItem: null });
  });
});

describe("tituloDoComentario", () => {
  it("usa a primeira linha e limita o tamanho", () => {
    expect(tituloDoComentario("  Trocar fôrma\nDetalhe")).toBe("Trocar fôrma");
    expect(tituloDoComentario("x".repeat(100))).toHaveLength(80);
  });
});
