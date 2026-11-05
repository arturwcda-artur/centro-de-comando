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
  /** Posição no ranking. Vazia para quem ainda não tem cartão com prazo cobrável. */
  posicao: number | null;
};

type Acumulador = LinhaEquipe & { somaDias: number; comTempo: number };

const DIA_MS = 86400000;

function somar(linhas: Map<string, Acumulador>, nome: string, c: CartaoEquipe, hoje: string) {
  const l = linhas.get(nome) ?? { nome, atribuidas: 0, abertas: 0, concluidas: 0, vencidas: 0, noPrazo: 0, cobraveis: 0, eficiencia: null, diasMedios: null, prazosAlterados: 0, posicao: null, somaDias: 0, comTempo: 0 };
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
      l.somaDias += Math.max(Date.parse(c.concluido_em) - Date.parse(c.criado_em), 0) / DIA_MS;
      l.comTempo += 1;
    }
  } else {
    l.abertas += 1;
    if (c.prazo && c.prazo < hoje) l.vencidas += 1;
    if (referencia && referencia < hoje) l.cobraveis += 1; // vencido em aberto conta contra a eficiência
  }
  linhas.set(nome, l);
}

/** Ranking: maior eficiência primeiro; no empate, quem tem mais cartões cobráveis. Sem base, vai para o fim. */
function fechar(linhas: Map<string, Acumulador>): LinhaEquipe[] {
  const ordenadas = [...linhas.values()]
    .map(({ somaDias, comTempo, ...l }) => ({
      ...l,
      eficiencia: l.cobraveis ? (l.noPrazo / l.cobraveis) * 100 : null,
      diasMedios: comTempo ? somaDias / comTempo : null,
    }))
    .sort((a, b) => (b.eficiencia ?? -1) - (a.eficiencia ?? -1) || b.cobraveis - a.cobraveis || b.atribuidas - a.atribuidas || a.nome.localeCompare(b.nome, "pt-BR"));
  let posicao = 0;
  return ordenadas.map((l) => ({ ...l, posicao: l.eficiencia === null || l.nome === SEM_RESPONSAVEL ? null : ++posicao }));
}

/**
 * Cartão com dois membros conta para os dois, então a soma por pessoa pode passar do total.
 * Com `desde`, concluídos antes da data ficam de fora; os abertos sempre contam.
 */
export function resumirEquipe(cartoes: CartaoEquipe[], hoje: string, desde?: string) {
  const validos = cartoes.filter((c) => c.status !== "cancelada" && !(desde && c.status === "concluida" && (c.concluido_em ?? "") < desde));
  const total = new Map<string, Acumulador>();
  const porLista = new Map<string, Acumulador>();
  const porResponsavel = new Map<string, Acumulador>();
  for (const c of validos) {
    somar(total, QUADRO_EQUIPE, c, hoje);
    somar(porLista, c.categoria?.split(" › ")[1] ?? "—", c, hoje);
    for (const nome of c.membros.length ? c.membros : [SEM_RESPONSAVEL]) somar(porResponsavel, nome, c, hoje);
  }
  return { total: fechar(total)[0] ?? null, porLista: fechar(porLista), porResponsavel: fechar(porResponsavel) };
}

/** Título sugerido para o cartão criado a partir de um comentário: a primeira linha, sem exagero. */
export function tituloDoComentario(texto: string): string {
  const linha = texto.trim().split("\n")[0].trim();
  return linha.length > 80 ? `${linha.slice(0, 79)}…` : linha;
}
