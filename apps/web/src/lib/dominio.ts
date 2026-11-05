/** Listas de domínio do banco (CHECKs das migrations) com rótulos em português. */

export const SITUACOES_OBRA = [
  { valor: "planejamento", rotulo: "Em planejamento", tom: "marca" },
  { valor: "andamento", rotulo: "Em andamento", tom: "ok" },
  { valor: "paralisada", rotulo: "Paralisada", tom: "alerta" },
  { valor: "aguardando", rotulo: "Aguardando", tom: "atencao" },
  { valor: "concluida", rotulo: "Concluída", tom: "neutro" },
  { valor: "cancelada", rotulo: "Cancelada", tom: "neutro" },
] as const;
export type SituacaoObra = (typeof SITUACOES_OBRA)[number]["valor"];

export const STATUS_RISCO = [
  { valor: "aberto", rotulo: "Aberto" },
  { valor: "em_tratamento", rotulo: "Em tratamento" },
  { valor: "mitigado", rotulo: "Mitigado" },
  { valor: "materializado", rotulo: "Materializado" },
  { valor: "encerrado", rotulo: "Encerrado" },
] as const;

export const STATUS_DECISAO = [
  { valor: "pendente", rotulo: "Pendente" },
  { valor: "tomada", rotulo: "Tomada" },
  { valor: "implementada", rotulo: "Implementada" },
  { valor: "cancelada", rotulo: "Cancelada" },
] as const;

export const STATUS_TAREFA = [
  { valor: "a_fazer", rotulo: "A fazer" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "aguardando_terceiro", rotulo: "Aguardando terceiro" },
  { valor: "concluida", rotulo: "Concluída" },
  { valor: "cancelada", rotulo: "Cancelada" },
] as const;

export const TIPOS_TAREFA = [
  { valor: "acao", rotulo: "Ação" },
  { valor: "cobranca", rotulo: "Cobrança" },
  { valor: "entrega", rotulo: "Entrega" },
  { valor: "pendencia", rotulo: "Pendência" },
] as const;

/** RN-45: visões de tarefas. */
export const VISOES_TAREFA = [
  { valor: "todas", rotulo: "Todas" },
  { valor: "minhas", rotulo: "Minhas atribuições" },
  { valor: "aguardando", rotulo: "Aguardando terceiros" },
  { valor: "cobrancas", rotulo: "Cobranças" },
  { valor: "criticas", rotulo: "Críticas" },
  { valor: "vencimentos", rotulo: "Vencimentos" },
  { valor: "concluidas", rotulo: "Concluídas" },
] as const;
export type VisaoTarefa = (typeof VISOES_TAREFA)[number]["valor"];

/**
 * RN-48: o que pode ser concluído pelo sistema. Tarefas manuais e do Notion, e cartões do Trello que
 * são do proprietário (sem responsável aqui). Cartões de terceiros continuam só leitura.
 */
export function podeConcluir(t: { fonte: string | null; responsavel_id?: string | null; status?: string | null }): boolean {
  if (t.status === "concluida" || t.status === "cancelada") return false;
  if (t.fonte === "manual" || t.fonte === "notion") return true;
  return t.fonte === "trello" && !t.responsavel_id;
}

/** Escore ≥ 27 conta como crítica mesmo sem a marcação manual (RN-45). */
export const ESCORE_CRITICO = 27;

/** Motivos legíveis da posição da tarefa na fila (recomendação de prioridade; não altera prazos). */
export function motivosPrioridade(t: { vencida?: boolean | null; vence_hoje?: boolean | null; dias_para_prazo?: number | null; critica?: boolean | null; impacto?: number | null; importancia?: number | null; tipo?: string | null }): string[] {
  const m: string[] = [];
  if (t.vencida) m.push(`vencida há ${Math.abs(t.dias_para_prazo ?? 0)} dia(s)`);
  else if (t.vence_hoje) m.push("vence hoje");
  else if (t.dias_para_prazo !== null && t.dias_para_prazo !== undefined && t.dias_para_prazo <= 2) m.push(`vence em ${t.dias_para_prazo} dia(s)`);
  if (t.critica) m.push("marcada como crítica");
  if ((t.impacto ?? 0) >= 4) m.push("impacto alto");
  if ((t.importancia ?? 0) >= 4) m.push("importância alta");
  if (t.tipo === "cobranca") m.push("cobrança");
  return m;
}

export const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"] as const;

export function rotuloSituacao(valor: string | null | undefined) {
  return SITUACOES_OBRA.find((s) => s.valor === valor) ?? { valor, rotulo: valor ?? "—", tom: "neutro" as const };
}

export function rotuloDe(lista: readonly { valor: string; rotulo: string }[], valor: string | null | undefined) {
  return lista.find((s) => s.valor === valor)?.rotulo ?? valor ?? "—";
}

/** RN-50: severidade = probabilidade × impacto. */
export function nivelSeveridade(severidade: number): { rotulo: string; tom: "alerta" | "atencao" | "ok" } {
  if (severidade >= 15) return { rotulo: "Crítico", tom: "alerta" };
  if (severidade >= 8) return { rotulo: "Alto", tom: "atencao" };
  return { rotulo: "Moderado", tom: "ok" };
}

export const TIPOS_ADITIVO = [
  { valor: "prazo", rotulo: "Prazo" },
  { valor: "acrescimo", rotulo: "Acréscimo" },
  { valor: "supressao", rotulo: "Supressão" },
  { valor: "reajuste", rotulo: "Reajuste" },
  { valor: "reequilibrio", rotulo: "Reequilíbrio" },
  { valor: "misto", rotulo: "Misto" },
] as const;

export const SITUACOES_ADITIVO = [
  { valor: "em_analise", rotulo: "Em análise" },
  { valor: "aprovado", rotulo: "Aprovado" },
  { valor: "rejeitado", rotulo: "Rejeitado" },
] as const;

export const SITUACOES_MEDICAO = [
  { valor: "elaborada", rotulo: "Elaborada" },
  { valor: "enviada", rotulo: "Enviada" },
  { valor: "aprovada", rotulo: "Aprovada" },
  { valor: "glosada", rotulo: "Aprovada com glosa" },
  { valor: "cancelada", rotulo: "Cancelada" },
] as const;

export const TIPOS_LANCAMENTO = [
  { valor: "faturamento", rotulo: "Faturamento" },
  { valor: "recebimento", rotulo: "Recebimento" },
  { valor: "previsao_recebimento", rotulo: "Previsão de recebimento" },
  { valor: "retencao", rotulo: "Retenção" },
] as const;

/** Quadros com cartões abertos. No Trello, a categoria guarda "quadro › lista". */
export function quadrosDoTrello(lista: { fonte: string | null; categoria: string | null }[]): string[] {
  const nomes = lista.filter((t) => t.fonte === "trello" && t.categoria).map((t) => (t.categoria as string).split(" › ")[0]);
  return [...new Set(nomes)].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/** Opções da base Demandas Ativas no Notion. */
export const PRIORIDADES_NOTION = ["🔴 Crítica", "🟠 Alta", "🟡 Média", "🟢 Baixa"].map((p) => ({ valor: p, rotulo: p }));
export const CATEGORIAS_NOTION = ["Estratégico", "Financeiro", "Contratos", "Jurídico", "Obras", "Marketing", "Operacional", "Infraestrutura"].map((c) => ({ valor: c, rotulo: c }));
