import { brl } from "@/lib/formato";

/** Regras de exibição de contratos e medições (ADR 0016). Sem acesso ao banco, para poder testar. */
export const DIAS_LEITURA_ANTIGA = 7;

type DadosAvisos = {
  valorContratado: number;
  somaItens: number;
  itensAcima: number;
  diferencas: { numero: number; diferenca: number }[];
  erroPlanilha: string | null;
  diasDesdeLeitura: number | null;
};

export function avisosContrato(d: DadosAvisos): string[] {
  const avisos: string[] = [];
  if (d.erroPlanilha) avisos.push(`Planilha de medição: ${d.erroPlanilha}`);
  if (d.somaItens > 0 && Math.abs(d.somaItens - d.valorContratado) > 1) avisos.push(`Os serviços da planilha somam ${brl(d.somaItens)}, e o valor contratado é ${brl(d.valorContratado)}.`);
  if (d.itensAcima > 0) avisos.push(`${d.itensAcima} serviços foram medidos acima da quantidade do contrato.`);
  for (const x of d.diferencas) avisos.push(`A planilha da medição ${x.numero} mudou depois do envio: diferença de ${brl(x.diferenca)}. Para aceitar, volte a medição para Elaborada e rode o atalho.`);
  if (d.diasDesdeLeitura !== null && d.diasDesdeLeitura > DIAS_LEITURA_ANTIGA) avisos.push(`A planilha não é lida há ${d.diasDesdeLeitura} dias.`);
  return avisos;
}

type MedicaoResumo = { situacao: string; periodo_fim: string; valor_medido: number; valor_glosado: number };

/**
 * Ponto de partida da Curva S vigente. As medições aprovadas antes do início do cronograma têm
 * prioridade; o valor digitado na Fase 6 fica como reserva.
 */
export function valorAnterior(medicoes: MedicaoResumo[], inicioVigente: string | null, digitado: { valor: number | null; data: string | null }) {
  const anteriores = inicioVigente ? medicoes.filter((m) => (m.situacao === "aprovada" || m.situacao === "glosada") && m.periodo_fim < inicioVigente) : [];
  if (anteriores.length > 0) {
    return {
      valor: anteriores.reduce((s, m) => s + m.valor_medido - m.valor_glosado, 0),
      data: anteriores.map((m) => m.periodo_fim).sort().at(-1) as string,
      origem: "medicoes" as const,
    };
  }
  return { valor: digitado.valor ?? 0, data: digitado.data, origem: "digitado" as const };
}

/** Sugestão de planilha da obra piloto. As demais obras informam o caminho no contrato. */
export function planilhaSugerida(codigoObra: string, pastaLocal: string | null): string | null {
  return codigoObra === "PRF-RECANTO" && pastaLocal ? `${pastaLocal}\\05_Medicoes\\1º_Medição_PRF.xlsx` : null;
}
