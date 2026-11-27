/**
 * Gatilhos do comandante (RN-49u): o que toca o alarme e com que limite. Gatilho desligado não some
 * da ficha: o item continua visível como Atenção, mas não vai para a Mesa. Sem banco, para testar.
 */
export type ChaveGatilho =
  | "ordem_vencida"
  | "ordem_parada"
  | "medicao_do_mes"
  | "prazo_contratual"
  | "caminho_critico"
  | "cronograma_desatualizado"
  | "aditivo_em_analise"
  | "diario_sem_registro"
  | "problema_critico";

export type Limite = { ativo: boolean; limite: number };
export type Gatilhos = Record<ChaveGatilho, Limite>;

/** Valores da Doutrina; valem enquanto o banco não responde ou se um gatilho faltar lá. */
export const GATILHOS_PADRAO: Gatilhos = {
  ordem_vencida: { ativo: true, limite: 3 },
  ordem_parada: { ativo: true, limite: 7 },
  medicao_do_mes: { ativo: true, limite: 5 },
  prazo_contratual: { ativo: true, limite: 0 },
  caminho_critico: { ativo: true, limite: 0 },
  cronograma_desatualizado: { ativo: true, limite: 7 },
  aditivo_em_analise: { ativo: true, limite: 30 },
  diario_sem_registro: { ativo: true, limite: 4 },
  problema_critico: { ativo: true, limite: 64 },
};

/** Linhas da tabela gatilhos → limites, completando com o padrão. */
export function lerGatilhos(linhas: { chave: string; ativo: boolean; limite: number }[] | null | undefined): Gatilhos {
  const g = { ...GATILHOS_PADRAO };
  for (const l of linhas ?? []) if (l.chave in g) g[l.chave as ChaveGatilho] = { ativo: l.ativo, limite: l.limite };
  return g;
}
