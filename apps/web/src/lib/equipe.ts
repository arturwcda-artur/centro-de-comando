import { hojeSP } from "@/lib/formato";

/** Painel da equipe do quadro Obras do Grupo - C.SALLES (ADR 0017). Sem acesso ao banco, para poder testar. */
export const QUADRO_EQUIPE = "Obras do Grupo - C.SALLES";
export const SEM_RESPONSAVEL = "Sem responsável";

/** Item de checklist de um cartão. */
export type ItemCartao = {
  concluido: boolean;
  criado_em: string | null;
  concluido_em: string | null;
  /** Quem marcou o item como concluído no Trello. É quem recebe o crédito. */
  resolvido_por?: string | null;
  /** Membro atribuído ao item. Vazio: fica com os membros do cartão. */
  responsaveis: string[];
};

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
  /** Cartão de rotina: fica fora da eficiência no prazo (RN-49b). */
  rotina?: boolean;
  itens?: ItemCartao[];
};

export type LinhaEquipe = {
  nome: string;
  /** Tarefas: os itens de cada cartão com checklist, ou 1 pelo cartão sem checklist (RN-49c). */
  sobResponsabilidade: number;
  resolvidas: number;
  pendentes: number;
  resolucao: number | null;
  /** Quantas das resolvidas são itens de checklist. */
  itensResolvidos: number;
  diasPorItem: number | null;
  vencidas: number;
  noPrazo: number;
  /** Cartões com prazo já cobrável: concluídos com prazo mais vencidos em aberto. */
  cobraveis: number;
  eficiencia: number | null;
  diasMedios: number | null;
  prazosAlterados: number;
  /** Posição no ranking, pela taxa de resolução. */
  posicao: number | null;
};

type Acumulador = LinhaEquipe & { somaDias: number; comTempo: number; somaDiasItem: number; itensComTempo: number };

const DIA_MS = 86400000;
const diasEntre = (de: string, ate: string) => Math.max(Date.parse(ate) - Date.parse(de), 0) / DIA_MS;
const listaDe = (categoria: string | null) => categoria?.split(" › ")[1] ?? "—";
const quem = (nomes: string[]) => (nomes.length ? nomes : [SEM_RESPONSAVEL]);

function linha(linhas: Map<string, Acumulador>, nome: string): Acumulador {
  const nova: Acumulador = { nome, sobResponsabilidade: 0, resolvidas: 0, pendentes: 0, resolucao: null, itensResolvidos: 0, diasPorItem: null, vencidas: 0, noPrazo: 0, cobraveis: 0, eficiencia: null, diasMedios: null, prazosAlterados: 0, posicao: null, somaDias: 0, comTempo: 0, somaDiasItem: 0, itensComTempo: 0 };
  const l = linhas.get(nome) ?? nova;
  linhas.set(nome, l);
  return l;
}

/** Prazo e tempo do cartão. Cartão de rotina não passa por aqui. */
function somarPrazo(l: Acumulador, c: CartaoEquipe, hoje: string, noPeriodo: boolean) {
  const referencia = c.prazo_original ?? c.prazo;
  l.prazosAlterados += c.prazo_alteracoes;
  if (c.status === "concluida") {
    if (!noPeriodo) return;
    if (referencia) {
      l.cobraveis += 1;
      if (c.concluido_em && hojeSP(new Date(c.concluido_em)) <= referencia) l.noPrazo += 1;
    }
    if (c.concluido_em && c.criado_em) {
      l.somaDias += diasEntre(c.criado_em, c.concluido_em);
      l.comTempo += 1;
    }
  } else {
    if (c.prazo && c.prazo < hoje) l.vencidas += 1;
    if (referencia && referencia < hoje) l.cobraveis += 1; // vencido em aberto conta contra a eficiência
  }
}

function somarTarefa(l: Acumulador, resolvida: boolean) {
  l.sobResponsabilidade += 1;
  if (resolvida) l.resolvidas += 1;
  else l.pendentes += 1;
}

function fechar(linhas: Map<string, Acumulador>): LinhaEquipe[] {
  const ordenadas = [...linhas.values()]
    .map(({ somaDias, comTempo, somaDiasItem, itensComTempo, ...l }) => ({
      ...l,
      resolucao: l.sobResponsabilidade ? (l.resolvidas / l.sobResponsabilidade) * 100 : null,
      eficiencia: l.cobraveis ? (l.noPrazo / l.cobraveis) * 100 : null,
      diasMedios: comTempo ? somaDias / comTempo : null,
      diasPorItem: itensComTempo ? somaDiasItem / itensComTempo : null,
    }))
    .sort((a, b) => Number(a.nome === SEM_RESPONSAVEL) - Number(b.nome === SEM_RESPONSAVEL) || (b.resolucao ?? -1) - (a.resolucao ?? -1) || b.sobResponsabilidade - a.sobResponsabilidade || a.nome.localeCompare(b.nome, "pt-BR"));
  let posicao = 0;
  return ordenadas.map((l) => ({ ...l, posicao: l.resolucao === null || l.nome === SEM_RESPONSAVEL ? null : ++posicao }));
}

/**
 * Decisão do proprietário em 05/11/2026: por enquanto, o crédito do item é do responsável pelo cartão.
 * Quem marcou cada item já fica guardado. Para passar a usar, troque para true depois de alinhar com a equipe.
 */
export const CREDITO_POR_QUEM_MARCOU = false;

function donosDoItem(i: ItemCartao, c: CartaoEquipe, resolvido: boolean, porQuemMarcou: boolean): string[] {
  if (!porQuemMarcou) return c.membros;
  if (resolvido && i.resolvido_por) return [i.resolvido_por];
  return i.responsaveis.length ? i.responsaveis : c.membros;
}

/**
 * Cartão com checklist vale pelos itens; sem checklist, vale 1 (RN-49c). Cartão concluído resolve
 * todos os seus itens, mesmo os não marcados. Tarefa com dois responsáveis conta para os dois, então
 * a soma por pessoa pode passar do total. Com `desde`, resolvidas antes da data ficam de fora.
 * Sem responsável fica no fim e fora do total e das listas, para não mascarar a eficiência da equipe.
 */
export function resumirEquipe(cartoes: CartaoEquipe[], hoje: string, desde?: string, porQuemMarcou = CREDITO_POR_QUEM_MARCOU) {
  const total = new Map<string, Acumulador>();
  const porLista = new Map<string, Acumulador>();
  const porResponsavel = new Map<string, Acumulador>();
  const destinos = (c: CartaoEquipe, nomes: string[]) => [...(nomes.length ? [linha(total, QUADRO_EQUIPE), linha(porLista, listaDe(c.categoria))] : []), ...quem(nomes).map((n) => linha(porResponsavel, n))];
  const foraDoPeriodo = (data: string | null) => !!desde && (data ?? "") < desde;

  for (const c of cartoes) {
    if (c.status === "cancelada") continue;
    const cartaoConcluido = c.status === "concluida";

    if (!c.rotina) {
      const noPeriodo = !foraDoPeriodo(c.concluido_em);
      if (!cartaoConcluido || noPeriodo) for (const l of destinos(c, c.membros)) somarPrazo(l, c, hoje, noPeriodo);
    }

    if (!c.itens?.length) {
      if (cartaoConcluido && foraDoPeriodo(c.concluido_em)) continue;
      for (const l of destinos(c, c.membros)) somarTarefa(l, cartaoConcluido);
      continue;
    }
    for (const i of c.itens) {
      const resolvido = i.concluido || cartaoConcluido;
      const data = i.concluido_em ?? c.concluido_em;
      if (resolvido && foraDoPeriodo(data)) continue;
      for (const l of destinos(c, donosDoItem(i, c, resolvido, porQuemMarcou))) {
        somarTarefa(l, resolvido);
        if (!resolvido) continue;
        l.itensResolvidos += 1;
        if (i.criado_em && data) {
          l.somaDiasItem += diasEntre(i.criado_em, data);
          l.itensComTempo += 1;
        }
      }
    }
  }
  return { total: fechar(total)[0] ?? null, porLista: fechar(porLista), porResponsavel: fechar(porResponsavel) };
}

/** Título sugerido para o cartão criado a partir de um comentário: a primeira linha, sem exagero. */
export function tituloDoComentario(texto: string): string {
  const linha = texto.trim().split("\n")[0].trim();
  return linha.length > 80 ? `${linha.slice(0, 79)}…` : linha;
}
