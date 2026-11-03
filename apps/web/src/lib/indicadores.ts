import type { Database } from "@/lib/database.types";
import { somarDias } from "@/lib/formato";

export type ObraResumo = Database["public"]["Views"]["v_obra_resumo"]["Row"];

export type Indicadores = {
  total: number;
  emAndamento: number;
  emPlanejamento: number;
  proximasDaConclusao: number;
  comAtraso: number;
  valorContratado: number;
  valorMedido: number;
  valorRecebido: number;
  saldoAMedir: number;
  /** Medido ÷ contratado da carteira (%), null sem contratos. */
  pctFinanceiroCarteira: number | null;
};

/** RN-30 (atraso) e critério de "próxima da conclusão": em andamento com ≥ 90% físico ou prazo vigente em até 30 dias. */
export function calcularIndicadores(obras: ObraResumo[], hoje: string): Indicadores {
  const limite = somarDias(hoje, 30);
  const ativas = obras.filter((o) => o.situacao !== "cancelada");
  const soma = (f: (o: ObraResumo) => number | null) => ativas.reduce((t, o) => t + Number(f(o) ?? 0), 0);

  const valorContratado = soma((o) => o.valor_contratado);
  const valorMedido = soma((o) => o.valor_medido);

  return {
    total: ativas.length,
    emAndamento: ativas.filter((o) => o.situacao === "andamento").length,
    emPlanejamento: ativas.filter((o) => o.situacao === "planejamento").length,
    proximasDaConclusao: ativas.filter(
      (o) =>
        o.situacao === "andamento" &&
        (Number(o.pct_fisico_realizado ?? 0) >= 90 ||
          (!!o.data_termino_contratual_vigente &&
            o.data_termino_contratual_vigente >= hoje &&
            o.data_termino_contratual_vigente <= limite)),
    ).length,
    comAtraso: ativas.filter((o) => Number(o.dias_alem_do_prazo ?? 0) > 0).length,
    valorContratado,
    valorMedido,
    valorRecebido: soma((o) => o.valor_recebido),
    saldoAMedir: soma((o) => o.saldo_a_medir),
    pctFinanceiroCarteira: valorContratado > 0 ? Math.round((10000 * valorMedido) / valorContratado) / 100 : null,
  };
}
