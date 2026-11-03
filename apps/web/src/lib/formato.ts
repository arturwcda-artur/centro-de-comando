/** Formatação pt-BR, R$ e fuso America/Sao_Paulo (ADR 0006). */
export const FUSO = "America/Sao_Paulo";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const moedaCompacta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const percentual = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function brl(valor: number | null | undefined, compacto = false): string {
  if (valor === null || valor === undefined) return "—";
  return (compacto ? moedaCompacta : moeda).format(valor);
}

export function pct(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return `${percentual.format(valor)}%`;
}

/** "2026-11-03" (date do Postgres) → "03/11/2026", sem deslocar o dia por fuso. */
export function dataCivil(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** Instante (timestamptz) → data e hora em São Paulo. */
export function dataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function hora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Data de hoje em São Paulo no formato ISO (AAAA-MM-DD). */
export function hojeSP(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}

/** Soma dias a uma data civil ISO. */
export function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Início e fim do dia civil em São Paulo, como instantes ISO (UTC−3, sem horário de verão). */
export function limitesDoDiaSP(iso: string): { inicio: string; fim: string } {
  return { inicio: `${iso}T00:00:00-03:00`, fim: `${iso}T23:59:59.999-03:00` };
}

export function dataExtensa(agora: Date = new Date()): string {
  const texto = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(agora);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
