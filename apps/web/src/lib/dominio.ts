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
