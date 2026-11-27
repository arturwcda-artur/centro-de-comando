/**
 * Placar oficial da equipe (RN-49p, 27/11/2026): períodos do calendário em vez de "últimos N dias".
 * A semana vai de segunda a domingo e o mês é o do calendário. Período fechado vira placar oficial
 * e não muda mais; o período em andamento é parcial. Sem banco, para poder testar.
 */
import { somarDias } from "@/lib/formato";

export type TipoPeriodo = "semana" | "mes";
/** inicio inclusivo, fim exclusivo (primeiro dia depois do período). Sem datas: todo o período. */
export type Janela = { tipo: TipoPeriodo | "todos"; inicio: string | null; fim: string | null };

/** O placar oficial começa a valer daqui; antes disso não há o que congelar. */
export const INICIO_PLACAR: Record<TipoPeriodo, string> = { mes: "2026-11-01", semana: "2026-11-23" };
/** Dias depois do fim do período antes de congelar, para a sincronização trazer as últimas marcações. */
export const FOLGA_FECHAMENTO = 1;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function segundaDe(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  return somarDias(dia, -((d.getUTCDay() + 6) % 7));
}

function proximoMes(primeiro: string): string {
  const [a, m] = primeiro.split("-").map(Number);
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, "0")}-01`;
}

/** Semana ou mês que contém o dia. */
export function janelaDe(tipo: TipoPeriodo, dia: string): Janela {
  if (tipo === "semana") {
    const inicio = segundaDe(dia);
    return { tipo, inicio, fim: somarDias(inicio, 7) };
  }
  const inicio = `${dia.slice(0, 7)}-01`;
  return { tipo, inicio, fim: proximoMes(inicio) };
}

/** Período imediatamente anterior, do mesmo tipo. */
export function janelaAnterior(j: Janela): Janela | null {
  if (j.tipo === "todos" || !j.inicio) return null;
  return janelaDe(j.tipo, somarDias(j.inicio, -1));
}

export function rotuloDaJanela(j: Janela): string {
  if (j.tipo === "todos" || !j.inicio || !j.fim) return "Todo o período";
  if (j.tipo === "mes") {
    const nome = MESES[Number(j.inicio.slice(5, 7)) - 1];
    return `${nome[0].toUpperCase()}${nome.slice(1)}/${j.inicio.slice(0, 4)}`;
  }
  return `Semana de ${ddmm(j.inicio)} a ${ddmm(somarDias(j.fim, -1))}`;
}

/** Já pode virar placar oficial: terminou e passou a folga. */
export const podeFechar = (j: Janela, hoje: string) => !!j.fim && hoje >= somarDias(j.fim, FOLGA_FECHAMENTO);

/** Períodos fechados desde o início do placar oficial, do mais antigo ao mais novo. */
export function periodosParaFechar(tipo: TipoPeriodo, hoje: string): Janela[] {
  const lista: Janela[] = [];
  for (let j = janelaDe(tipo, INICIO_PLACAR[tipo]); podeFechar(j, hoje); j = janelaDe(tipo, j.fim!)) lista.push(j);
  return lista;
}

/** Limites como instantes em São Paulo (UTC−3, sem horário de verão), para comparar com as datas do Trello. */
export const instanteSP = (dia: string | null) => (dia ? `${dia}T03:00:00` : undefined);

/** Lê ?periodo=semana|mes|todos&ref=AAAA-MM-DD. Sem nada: o mês em andamento. */
export function lerJanela(periodo: unknown, ref: unknown, hoje: string): Janela {
  if (periodo === "todos") return { tipo: "todos", inicio: null, fim: null };
  const tipo: TipoPeriodo = periodo === "semana" ? "semana" : "mes";
  const dia = typeof ref === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ref) && ref <= hoje ? ref : hoje;
  return janelaDe(tipo, dia);
}

export const linkDaJanela = (j: Janela) => (j.tipo === "todos" || !j.inicio ? "periodo=todos" : `periodo=${j.tipo}&ref=${j.inicio}`);
