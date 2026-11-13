/** Regras dos alertas automáticos (RN-83). Sem IA e sem acesso ao banco, para poder testar. */
import { dataCivil, somarDias } from "@/lib/formato";

export const DIAS_TERMINO_CONTRATO = 60;
export const DIAS_SEM_MEDICAO = 35;
export const DIAS_VENCIMENTO = 7;

export type Alerta = { grupo: "Contratos" | "Prazos" | "Equipe" | "Problemas" | "Integrações"; grave: boolean; texto: string; href: string };

type Dados = {
  hoje: string;
  contratos: { contrato_id: string | null; numero: string | null; obra_id: string | null; data_termino_vigente: string | null; saldo_a_medir: number | null }[];
  /** Término do cronograma vigente, por obra. */
  terminos: Record<string, string>;
  /** Fim do último período medido, por contrato. Só entra contrato que já teve medição. */
  ultimaMedicao: Record<string, string>;
  vencimentos: { tipo: string | null; descricao: string | null; data: string | null }[];
  tarefasVencidas: number;
  cartoesParados: number;
  /** Problemas com GUT ≥ 64 ainda sem plano de ação. */
  problemasCriticosSemPlano: number;
  integracoes: string[];
};

const TIPOS: Record<string, string> = { marco: "Marco", recebimento_previsto: "Recebimento", decisao: "Decisão" };
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function montarAlertas(d: Dados): Alerta[] {
  const alertas: Alerta[] = d.integracoes.map((texto) => ({ grupo: "Integrações", grave: true, texto, href: "/integracoes" }));

  for (const c of d.contratos) {
    const href = `/contratos/${c.contrato_id}`;
    const fim = c.data_termino_vigente;
    const termino = c.obra_id ? d.terminos[c.obra_id] : undefined;
    if (fim && fim < d.hoje && (c.saldo_a_medir ?? 0) > 0) alertas.push({ grupo: "Contratos", grave: true, texto: `Contrato ${c.numero}: venceu em ${dataCivil(fim)} com saldo a medir.`, href });
    else if (fim && fim >= d.hoje && fim <= somarDias(d.hoje, DIAS_TERMINO_CONTRATO)) alertas.push({ grupo: "Contratos", grave: false, texto: `Contrato ${c.numero}: termina em ${dataCivil(fim)}.`, href });
    if (fim && termino && termino > fim) alertas.push({ grupo: "Contratos", grave: true, texto: `Contrato ${c.numero}: termina em ${dataCivil(fim)}, antes do cronograma (${dataCivil(termino)}).`, href });

    const medicao = c.contrato_id ? d.ultimaMedicao[c.contrato_id] : undefined;
    if (medicao && medicao < somarDias(d.hoje, -DIAS_SEM_MEDICAO) && (c.saldo_a_medir ?? 0) > 0) alertas.push({ grupo: "Contratos", grave: false, texto: `Contrato ${c.numero}: última medição até ${dataCivil(medicao)}.`, href });
  }

  if (d.tarefasVencidas > 0) alertas.push({ grupo: "Prazos", grave: true, texto: `${plural(d.tarefasVencidas, "tarefa vencida", "tarefas vencidas")}.`, href: "/tarefas" });
  for (const v of d.vencimentos) {
    const tipo = v.tipo ? TIPOS[v.tipo] : undefined;
    if (!tipo || !v.data || v.data > somarDias(d.hoje, DIAS_VENCIMENTO)) continue;
    const vencido = v.data < d.hoje;
    alertas.push({ grupo: "Prazos", grave: vencido, texto: `${tipo}: ${v.descricao}. ${vencido ? "Venceu" : "Vence"} em ${dataCivil(v.data)}.`, href: v.tipo === "decisao" ? "/problemas" : v.tipo === "marco" ? "/planejamento" : "/contratos" });
  }

  if (d.cartoesParados > 0) alertas.push({ grupo: "Equipe", grave: false, texto: `${plural(d.cartoesParados, "cartão parado", "cartões parados")} há 14 dias ou mais.`, href: "/equipe" });
  if (d.problemasCriticosSemPlano > 0) alertas.push({ grupo: "Problemas", grave: true, texto: `${plural(d.problemasCriticosSemPlano, "problema crítico sem plano de ação", "problemas críticos sem plano de ação")}.`, href: "/problemas" });

  return alertas.sort((a, b) => Number(b.grave) - Number(a.grave));
}
