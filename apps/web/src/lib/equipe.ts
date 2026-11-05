/** Painel da equipe do quadro Obras do Grupo - C.SALLES (ADR 0017). Sem acesso ao banco, para poder testar. */
export const QUADRO_EQUIPE = "Obras do Grupo - C.SALLES";
export const SEM_RESPONSAVEL = "Sem responsável";

export type CartaoEquipe = {
  status: string;
  prazo: string | null;
  concluida_em: string | null;
  categoria: string | null;
  membros: string[];
};

export type LinhaEquipe = { nome: string; atribuidas: number; abertas: number; concluidas: number; vencidas: number; percentual: number | null };

function somar(linhas: Map<string, LinhaEquipe>, nome: string, c: CartaoEquipe, hoje: string) {
  const l = linhas.get(nome) ?? { nome, atribuidas: 0, abertas: 0, concluidas: 0, vencidas: 0, percentual: null };
  l.atribuidas += 1;
  if (c.status === "concluida") l.concluidas += 1;
  else {
    l.abertas += 1;
    if (c.prazo && c.prazo < hoje) l.vencidas += 1;
  }
  l.percentual = (l.concluidas / l.atribuidas) * 100;
  linhas.set(nome, l);
}

const ordenar = (linhas: Map<string, LinhaEquipe>) => [...linhas.values()].sort((a, b) => b.atribuidas - a.atribuidas || a.nome.localeCompare(b.nome, "pt-BR"));

/**
 * Cartão com dois membros conta para os dois, então a soma por pessoa pode passar do total.
 * Com `desde`, concluídos antes da data ficam de fora; os abertos sempre contam.
 */
export function resumirEquipe(cartoes: CartaoEquipe[], hoje: string, desde?: string) {
  const validos = cartoes.filter((c) => c.status !== "cancelada" && !(desde && c.status === "concluida" && (c.concluida_em ?? "") < desde));
  const total = new Map<string, LinhaEquipe>();
  const porLista = new Map<string, LinhaEquipe>();
  const porResponsavel = new Map<string, LinhaEquipe>();
  for (const c of validos) {
    somar(total, QUADRO_EQUIPE, c, hoje);
    somar(porLista, c.categoria?.split(" › ")[1] ?? "—", c, hoje);
    for (const nome of c.membros.length ? c.membros : [SEM_RESPONSAVEL]) somar(porResponsavel, nome, c, hoje);
  }
  return { total: total.get(QUADRO_EQUIPE) ?? null, porLista: ordenar(porLista), porResponsavel: ordenar(porResponsavel) };
}

/** Título sugerido para o cartão criado a partir de um comentário: a primeira linha, sem exagero. */
export function tituloDoComentario(texto: string): string {
  const linha = texto.trim().split("\n")[0].trim();
  return linha.length > 80 ? `${linha.slice(0, 79)}…` : linha;
}
