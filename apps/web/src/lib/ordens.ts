/**
 * Controle de ordens (RN-49t): ordem é a tarefa que nasceu de uma decisão do gestor, delegada à
 * equipe ou assumida por ele. Responde "o que eu mandei fazer foi feito?". Sem banco, para testar.
 */
import { GATILHOS_PADRAO, type Gatilhos } from "@/lib/gatilhos";

export type OrdemBase = { status: string; prazo: string | null; atualizado_em: string; concluida_em: string | null; ordem_conferida_em: string | null };
export type CodigoSituacao = "vencida" | "parada" | "conferir" | "em_dia" | "conferida" | "cancelada";
export type SituacaoOrdem = { codigo: CodigoSituacao; texto: string; cobrar: boolean };

const dias = (de: string, ate: string) => Math.round((Date.parse(ate.slice(0, 10)) - Date.parse(de.slice(0, 10))) / 864e5);
const nDias = (n: number) => `${n} ${n === 1 ? "dia" : "dias"}`;

/** Ordem da lista: o que pede ação primeiro. */
export const ORDEM_SITUACAO: Record<CodigoSituacao, number> = { vencida: 0, parada: 1, conferir: 2, em_dia: 3, conferida: 4, cancelada: 5 };

export function situacaoDaOrdem(o: OrdemBase, hoje: string, g: Gatilhos = GATILHOS_PADRAO): SituacaoOrdem {
  if (o.status === "cancelada") return { codigo: "cancelada", texto: "Cancelada", cobrar: false };
  if (o.status === "concluida" || o.concluida_em) {
    if (o.ordem_conferida_em) return { codigo: "conferida", texto: `Conferida em ${o.ordem_conferida_em.slice(0, 10).split("-").reverse().join("/")}`, cobrar: false };
    return { codigo: "conferir", texto: "Concluída: conferir o resultado", cobrar: false };
  }
  const atraso = o.prazo && o.prazo < hoje ? dias(o.prazo, hoje) : 0;
  if (atraso > 0) {
    const cobrar = g.ordem_vencida.ativo && atraso >= g.ordem_vencida.limite;
    return { codigo: "vencida", texto: `Vencida há ${nDias(atraso)}`, cobrar };
  }
  const parada = dias(o.atualizado_em, hoje);
  if (g.ordem_parada.ativo && parada >= g.ordem_parada.limite) return { codigo: "parada", texto: `Sem movimento há ${nDias(parada)}`, cobrar: true };
  return { codigo: "em_dia", texto: o.prazo ? `Em dia (prazo ${o.prazo.split("-").reverse().join("/")})` : "Em dia, sem prazo", cobrar: false };
}
