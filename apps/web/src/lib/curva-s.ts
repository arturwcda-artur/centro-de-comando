import { somarDias } from "@/lib/formato";

/** Curva S em reais, pesada pelo custo de cada atividade (ADR 0015). Trabalha só com datas civis. */
export type AtividadeCurva = {
  custo: number | null;
  inicio_previsto: string | null;
  fim_previsto: string | null;
  resumo: boolean;
  marco: boolean;
};

export type PontoCurva = { data: string; valor: number };

const numeroDoDia = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86400000;

type ComCusto = AtividadeCurva & { custo: number; inicio_previsto: string; fim_previsto: string };
const comCusto = (lista: AtividadeCurva[]) => lista.filter((a): a is ComCusto => !a.resumo && !!a.custo && !!a.inicio_previsto && !!a.fim_previsto);

/** Valor acumulado até a data, inclusive, com o custo dividido igualmente pelos dias corridos. */
export function valorAcumulado(atividades: AtividadeCurva[], data: string, partida = 0): number {
  const dia = numeroDoDia(data);
  return comCusto(atividades).reduce((soma, a) => {
    const inicio = numeroDoDia(a.inicio_previsto);
    const dias = numeroDoDia(a.fim_previsto) - inicio + 1;
    return soma + a.custo * Math.min(Math.max((dia - inicio + 1) / dias, 0), 1);
  }, partida);
}

/** Um ponto por semana, do início da primeira atividade com custo até o fim da última. */
export function serieSemanal(atividades: AtividadeCurva[], partida = 0): PontoCurva[] {
  const lista = comCusto(atividades);
  if (lista.length === 0) return [];
  const inicio = lista.map((a) => a.inicio_previsto).sort()[0];
  const fim = lista.map((a) => a.fim_previsto).sort().at(-1)!;
  const datas: string[] = [];
  for (let d = inicio; d < fim; d = somarDias(d, 7)) datas.push(d);
  datas.push(fim);
  return datas.map((data) => ({ data, valor: valorAcumulado(lista, data, partida) }));
}

/** Último término entre as atividades. Marcos ficam de fora: o limite contratual não é o fim da obra. */
export function terminoPrevisto(atividades: Pick<AtividadeCurva, "fim_previsto" | "resumo" | "marco">[]): string | null {
  return (
    atividades
      .filter((a) => !a.resumo && !a.marco && a.fim_previsto)
      .map((a) => a.fim_previsto as string)
      .sort()
      .at(-1) ?? null
  );
}

export function atrasada(a: { resumo: boolean; fim_previsto: string | null; percentual: number }, hoje: string): boolean {
  return !a.resumo && !!a.fim_previsto && a.fim_previsto < hoje && a.percentual < 100;
}

export const diferencaEmDias = (de: string, ate: string) => numeroDoDia(ate) - numeroDoDia(de);
