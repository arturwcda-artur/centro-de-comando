import { hojeSP } from "@/lib/formato";

/** Painel da equipe do quadro Obras do Grupo - C.SALLES (ADR 0017). Sem acesso ao banco, para poder testar. */
export const QUADRO_EQUIPE = "Obras do Grupo - C.SALLES";
export const SEM_RESPONSAVEL = "Sem responsável";

export type CartaoEquipe = {
  status: string;
  prazo: string | null;
  /** Data real da conclusão, lida do histórico do Trello. */
  concluido_em: string | null;
  criado_em: string | null;
  /** Primeira data de entrega. É a referência da eficiência, para adiar não melhorar a taxa. */
  prazo_original: string | null;
  prazo_alteracoes: number;
  categoria: string | null;
  membros: string[];
  /** Cartão de rotina: sai das contagens e da taxa, e conta pelos itens de checklist (RN-49b). */
  rotina?: boolean;
};

/** Item concluído de um cartão de rotina. */
export type ItemRotina = {
  criado_em: string | null;
  concluido_em: string | null;
  responsaveis: string[];
  categoria: string | null;
};

export type LinhaEquipe = {
  nome: string;
  atribuidas: number;
  abertas: number;
  concluidas: number;
  vencidas: number;
  noPrazo: number;
  /** Cartões com prazo já cobrável: concluídos com prazo mais vencidos em aberto. */
  cobraveis: number;
  eficiencia: number | null;
  diasMedios: number | null;
  prazosAlterados: number;
  itensRotina: number;
  diasPorItem: number | null;
  /** Posição no ranking. Vazia para quem ainda não tem cartão com prazo cobrável. */
  posicao: number | null;
};

type Acumulador = LinhaEquipe & { somaDias: number; comTempo: number; somaDiasItem: number; itensComTempo: number };

const DIA_MS = 86400000;
const diasEntre = (de: string, ate: string) => Math.max(Date.parse(ate) - Date.parse(de), 0) / DIA_MS;
const listaDe = (categoria: string | null) => categoria?.split(" › ")[1] ?? "—";

function linha(linhas: Map<string, Acumulador>, nome: string): Acumulador {
  const nova: Acumulador = { nome, atribuidas: 0, abertas: 0, concluidas: 0, vencidas: 0, noPrazo: 0, cobraveis: 0, eficiencia: null, diasMedios: null, prazosAlterados: 0, itensRotina: 0, diasPorItem: null, posicao: null, somaDias: 0, comTempo: 0, somaDiasItem: 0, itensComTempo: 0 };
  const l = linhas.get(nome) ?? nova;
  linhas.set(nome, l);
  return l;
}

function somar(linhas: Map<string, Acumulador>, nome: string, c: CartaoEquipe, hoje: string) {
  const l = linha(linhas, nome);
  const referencia = c.prazo_original ?? c.prazo;
  l.atribuidas += 1;
  l.prazosAlterados += c.prazo_alteracoes;
  if (c.status === "concluida") {
    l.concluidas += 1;
    if (referencia) {
      l.cobraveis += 1;
      if (c.concluido_em && hojeSP(new Date(c.concluido_em)) <= referencia) l.noPrazo += 1;
    }
    if (c.concluido_em && c.criado_em) {
      l.somaDias += diasEntre(c.criado_em, c.concluido_em);
      l.comTempo += 1;
    }
  } else {
    l.abertas += 1;
    if (c.prazo && c.prazo < hoje) l.vencidas += 1;
    if (referencia && referencia < hoje) l.cobraveis += 1; // vencido em aberto conta contra a eficiência
  }
}

function somarItem(linhas: Map<string, Acumulador>, nome: string, i: ItemRotina) {
  const l = linha(linhas, nome);
  l.itensRotina += 1;
  if (i.criado_em && i.concluido_em) {
    l.somaDiasItem += diasEntre(i.criado_em, i.concluido_em);
    l.itensComTempo += 1;
  }
}

/** Ranking: maior eficiência primeiro; no empate, quem tem mais cartões cobráveis. Sem base, vai para o fim. */
function fechar(linhas: Map<string, Acumulador>): LinhaEquipe[] {
  const ordenadas = [...linhas.values()]
    .map(({ somaDias, comTempo, somaDiasItem, itensComTempo, ...l }) => ({
      ...l,
      eficiencia: l.cobraveis ? (l.noPrazo / l.cobraveis) * 100 : null,
      diasMedios: comTempo ? somaDias / comTempo : null,
      diasPorItem: itensComTempo ? somaDiasItem / itensComTempo : null,
    }))
    .sort((a, b) => (b.eficiencia ?? -1) - (a.eficiencia ?? -1) || b.cobraveis - a.cobraveis || b.itensRotina - a.itensRotina || b.atribuidas - a.atribuidas || a.nome.localeCompare(b.nome, "pt-BR"));
  let posicao = 0;
  return ordenadas.map((l) => ({ ...l, posicao: l.eficiencia === null || l.nome === SEM_RESPONSAVEL ? null : ++posicao }));
}

/**
 * Cartão com dois membros conta para os dois, então a soma por pessoa pode passar do total.
 * Com `desde`, concluídos antes da data ficam de fora; os abertos sempre contam.
 * Cartões de rotina não entram nas contagens: o trabalho deles vem em `itens`.
 */
export function resumirEquipe(cartoes: CartaoEquipe[], hoje: string, desde?: string, itens: ItemRotina[] = []) {
  const validos = cartoes.filter((c) => !c.rotina && c.status !== "cancelada" && !(desde && c.status === "concluida" && (c.concluido_em ?? "") < desde));
  const total = new Map<string, Acumulador>();
  const porLista = new Map<string, Acumulador>();
  const porResponsavel = new Map<string, Acumulador>();
  for (const c of validos) {
    somar(total, QUADRO_EQUIPE, c, hoje);
    somar(porLista, listaDe(c.categoria), c, hoje);
    for (const nome of c.membros.length ? c.membros : [SEM_RESPONSAVEL]) somar(porResponsavel, nome, c, hoje);
  }
  for (const i of itens) {
    if (desde && (i.concluido_em ?? "") < desde) continue;
    somarItem(total, QUADRO_EQUIPE, i);
    somarItem(porLista, listaDe(i.categoria), i);
    for (const nome of i.responsaveis.length ? i.responsaveis : [SEM_RESPONSAVEL]) somarItem(porResponsavel, nome, i);
  }
  return { total: fechar(total)[0] ?? null, porLista: fechar(porLista), porResponsavel: fechar(porResponsavel) };
}

/** Título sugerido para o cartão criado a partir de um comentário: a primeira linha, sem exagero. */
export function tituloDoComentario(texto: string): string {
  const linha = texto.trim().split("\n")[0].trim();
  return linha.length > 80 ? `${linha.slice(0, 79)}…` : linha;
}
