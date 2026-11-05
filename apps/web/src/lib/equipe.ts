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
  /** Cartões de que a pessoa é responsável. Cartão de rotina fica de fora. */
  atribuidas: number;
  abertas: number;
  concluidas: number;
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
  /** Cartões no prazo menos cartões atrasados: positivo é bom, negativo pede atenção. */
  saldoPrazo: number | null;
  diasMedios: number | null;
  /** Tempo da criação à resolução, em todas as tarefas resolvidas: itens e cartões sem checklist. */
  diasPorTarefa: number | null;
  prazosAlterados: number;
};

type Acumulador = LinhaEquipe & { somaDias: number; comTempo: number; somaDiasItem: number; itensComTempo: number; somaDiasTarefa: number; tarefasComTempo: number };

const DIA_MS = 86400000;
const diasEntre = (de: string, ate: string) => Math.max(Date.parse(ate) - Date.parse(de), 0) / DIA_MS;
const listaDe = (categoria: string | null) => categoria?.split(" › ")[1] ?? "—";
const quem = (nomes: string[]) => (nomes.length ? nomes : [SEM_RESPONSAVEL]);

function linha(linhas: Map<string, Acumulador>, nome: string): Acumulador {
  const nova: Acumulador = { nome, atribuidas: 0, abertas: 0, concluidas: 0, sobResponsabilidade: 0, resolvidas: 0, pendentes: 0, resolucao: null, itensResolvidos: 0, diasPorItem: null, vencidas: 0, noPrazo: 0, cobraveis: 0, eficiencia: null, saldoPrazo: null, diasMedios: null, diasPorTarefa: null, prazosAlterados: 0, somaDias: 0, comTempo: 0, somaDiasItem: 0, itensComTempo: 0, somaDiasTarefa: 0, tarefasComTempo: 0 };
  const l = linhas.get(nome) ?? nova;
  linhas.set(nome, l);
  return l;
}

/** Prazo e tempo do cartão. Cartão de rotina não passa por aqui. */
function somarPrazo(l: Acumulador, c: CartaoEquipe, hoje: string, noPeriodo: boolean) {
  const referencia = c.prazo_original ?? c.prazo;
  l.prazosAlterados += c.prazo_alteracoes;
  l.atribuidas += 1;
  if (c.status === "concluida") {
    if (!noPeriodo) return;
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

function somarTarefa(l: Acumulador, resolvida: boolean, parte: number) {
  l.sobResponsabilidade += parte;
  if (resolvida) l.resolvidas += parte;
  else l.pendentes += parte;
}

/** Sem posições: a ordem é por entregas, para ter mais tarefas não parecer pior. Sem responsável vai para o fim. */
function fechar(linhas: Map<string, Acumulador>): LinhaEquipe[] {
  return [...linhas.values()]
    .map(({ somaDias, comTempo, somaDiasItem, itensComTempo, somaDiasTarefa, tarefasComTempo, ...l }) => ({
      ...l,
      resolucao: l.sobResponsabilidade ? (l.resolvidas / l.sobResponsabilidade) * 100 : null,
      eficiencia: l.cobraveis ? (l.noPrazo / l.cobraveis) * 100 : null,
      saldoPrazo: l.cobraveis ? l.noPrazo - (l.cobraveis - l.noPrazo) : null,
      diasMedios: comTempo ? somaDias / comTempo : null,
      diasPorItem: itensComTempo ? somaDiasItem / itensComTempo : null,
      diasPorTarefa: tarefasComTempo ? somaDiasTarefa / tarefasComTempo : null,
    }))
    .sort((a, b) => Number(a.nome === SEM_RESPONSAVEL) - Number(b.nome === SEM_RESPONSAVEL) || b.resolvidas - a.resolvidas || b.pendentes - a.pendentes || a.nome.localeCompare(b.nome, "pt-BR"));
}

/**
 * Decisão do proprietário em 05/11/2026: o item resolvido é de quem marcou no Trello, e a equipe
 * combina que cada um marca o que resolveu. O cartão é sempre dos responsáveis, porque encerrar um
 * cartão costuma ser ato de gestão. Com false, os itens também voltam aos responsáveis.
 */
export const CREDITO_POR_QUEM_MARCOU = true;

function donosDoItem(i: ItemCartao, c: CartaoEquipe, resolvido: boolean, porQuemMarcou: boolean): string[] {
  if (!porQuemMarcou) return c.membros;
  if (resolvido && i.resolvido_por) return [i.resolvido_por];
  return i.responsaveis.length ? i.responsaveis : c.membros;
}

/**
 * Cartão com checklist vale pelos itens; sem checklist, vale 1 (RN-49c). Cartão concluído resolve
 * todos os seus itens, mesmo os não marcados. Tarefa com dois responsáveis vale metade para cada um,
 * então a soma das pessoas bate com o total. Com `desde` e `ate`, resolvidas fora do intervalo ficam de fora.
 * Sem responsável fica no fim e fora do total e das listas, para não mascarar a eficiência da equipe.
 */
export function resumirEquipe(cartoes: CartaoEquipe[], hoje: string, desde?: string, porQuemMarcou = CREDITO_POR_QUEM_MARCOU, ate?: string) {
  const total = new Map<string, Acumulador>();
  const porLista = new Map<string, Acumulador>();
  const porResponsavel = new Map<string, Acumulador>();
  const destinos = (c: CartaoEquipe, nomes: string[]) => [...(nomes.length ? [linha(total, QUADRO_EQUIPE), linha(porLista, listaDe(c.categoria))] : []), ...quem(nomes).map((n) => linha(porResponsavel, n))];
  const foraDoPeriodo = (data: string | null) => (!!desde && (data ?? "") < desde) || (!!ate && (data ?? "") >= ate);
  const somarTempo = (l: Acumulador, parte: number, criado: string | null, resolvido: string | null) => {
    if (!criado || !resolvido) return;
    l.somaDiasTarefa += diasEntre(criado, resolvido) * parte;
    l.tarefasComTempo += parte;
  };

  for (const c of cartoes) {
    if (c.status === "cancelada") continue;
    const cartaoConcluido = c.status === "concluida";

    if (!c.rotina) {
      const noPeriodo = !foraDoPeriodo(c.concluido_em);
      if (!cartaoConcluido || noPeriodo) for (const l of destinos(c, c.membros)) somarPrazo(l, c, hoje, noPeriodo);
    }

    // O total e a lista recebem a tarefa inteira; as pessoas, a sua parte
    const contar = (nomes: string[], resolvida: boolean, extra?: (l: Acumulador, parte: number) => void) => {
      const parte = 1 / Math.max(nomes.length, 1);
      if (nomes.length) for (const l of [linha(total, QUADRO_EQUIPE), linha(porLista, listaDe(c.categoria))]) (somarTarefa(l, resolvida, 1), extra?.(l, 1));
      for (const nome of quem(nomes)) {
        const l = linha(porResponsavel, nome);
        somarTarefa(l, resolvida, parte);
        extra?.(l, parte);
      }
    };

    if (!c.itens?.length) {
      if (cartaoConcluido && foraDoPeriodo(c.concluido_em)) continue;
      contar(c.membros, cartaoConcluido, (l, parte) => {
        if (cartaoConcluido) somarTempo(l, parte, c.criado_em, c.concluido_em);
      });
      continue;
    }
    for (const i of c.itens) {
      const resolvido = i.concluido || cartaoConcluido;
      const data = i.concluido_em ?? c.concluido_em;
      if (resolvido && foraDoPeriodo(data)) continue;
      contar(donosDoItem(i, c, resolvido, porQuemMarcou), resolvido, (l, parte) => {
        if (!resolvido) return;
        l.itensResolvidos += parte;
        somarTempo(l, parte, i.criado_em, data);
        if (i.criado_em && data) {
          l.somaDiasItem += diasEntre(i.criado_em, data) * parte;
          l.itensComTempo += parte;
        }
      });
    }
  }
  return { total: fechar(total)[0] ?? null, porLista: fechar(porLista), porResponsavel: fechar(porResponsavel) };
}

const segundaDaSemana = (dia: string) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

/** Cada tarefa do quadro, com responsável: item de checklist ou cartão sem checklist. */
function tarefasDaEquipe(cartoes: CartaoEquipe[], porQuemMarcou: boolean) {
  const tarefas: { criada_em: string | null; resolvida_em: string | null }[] = [];
  for (const c of cartoes) {
    if (c.status === "cancelada") continue;
    const cartaoConcluido = c.status === "concluida";
    if (!c.itens?.length) {
      if (c.membros.length) tarefas.push({ criada_em: c.criado_em, resolvida_em: cartaoConcluido ? c.concluido_em : null });
      continue;
    }
    for (const i of c.itens) {
      const resolvido = i.concluido || cartaoConcluido;
      if (donosDoItem(i, c, resolvido, porQuemMarcou).length) tarefas.push({ criada_em: i.criado_em, resolvida_em: resolvido ? (i.concluido_em ?? c.concluido_em) : null });
    }
  }
  return tarefas;
}

/** Tarefas que entraram e que foram resolvidas por semana, de segunda a domingo, em ordem do tempo. */
export function fluxoPorSemana(cartoes: CartaoEquipe[], hoje: string, semanas = 8, porQuemMarcou = CREDITO_POR_QUEM_MARCOU) {
  const atual = segundaDaSemana(hoje);
  const inicios = Array.from({ length: semanas }, (_, n) => {
    const d = new Date(`${atual}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7 * (semanas - 1 - n));
    return d.toISOString().slice(0, 10);
  });
  const linhas = new Map(inicios.map((inicio) => [inicio, { inicio, entraram: 0, resolvidas: 0 }]));
  const semanaDe = (data: string | null) => (data ? linhas.get(segundaDaSemana(hojeSP(new Date(data)))) : undefined);
  for (const t of tarefasDaEquipe(cartoes, porQuemMarcou)) {
    const entrou = semanaDe(t.criada_em);
    if (entrou) entrou.entraram += 1;
    const saiu = semanaDe(t.resolvida_em);
    if (saiu) saiu.resolvidas += 1;
  }
  return [...linhas.values()];
}

/** Tarefas que entraram a partir da data. Sem data, conta todas. */
export function tarefasQueEntraram(cartoes: CartaoEquipe[], desde?: string, porQuemMarcou = CREDITO_POR_QUEM_MARCOU): number {
  return tarefasDaEquipe(cartoes, porQuemMarcou).filter((t) => !desde || (t.criada_em ?? "") >= desde).length;
}

export const DIAS_PARADA = 14;

/** Cartões abertos sem nenhuma movimentação no Trello, do mais antigo para o mais novo. Rotina fica de fora. */
export function cartoesParados(cartoes: (CartaoEquipe & { id: string; titulo: string; ultima_atividade: string | null })[], agora: Date, dias = DIAS_PARADA) {
  return cartoes
    .filter((c) => c.status !== "concluida" && c.status !== "cancelada" && !c.rotina && c.ultima_atividade)
    .map((c) => ({ id: c.id, titulo: c.titulo, membros: c.membros, dias: Math.floor((agora.getTime() - Date.parse(c.ultima_atividade as string)) / DIA_MS) }))
    .filter((c) => c.dias >= dias)
    .sort((x, y) => y.dias - x.dias);
}

/** Título sugerido para o cartão criado a partir de um comentário: a primeira linha, sem exagero. */
export function tituloDoComentario(texto: string): string {
  const linha = texto.trim().split("\n")[0].trim();
  return linha.length > 80 ? `${linha.slice(0, 79)}…` : linha;
}
