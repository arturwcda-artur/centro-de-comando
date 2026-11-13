/** Problemas e ações 5W2H (RN-49h, ADR 0023). Sem acesso ao banco, para poder testar. */
import { z } from "zod";

/** Escalas da Matriz GUT, com as frases da planilha GUT 4.0 do proprietário. */
export const GRAVIDADE = ["Sem gravidade", "Pouco grave", "Grave", "Muito grave", "Extremamente grave"];
export const URGENCIA = ["Pode esperar", "Longo prazo", "Prazo médio", "Curto prazo", "Imediatamente"];
export const TENDENCIA = ["Desaparece", "Reduz-se ligeiramente", "Permanece", "Aumenta", "Piora muito"];
export const opcoesEscala = (escala: string[]) => escala.map((rotulo, i) => ({ valor: String(i + 1), rotulo: `${i + 1} · ${rotulo}` }));

export const STATUS_PROBLEMA = [
  { valor: "aberto", rotulo: "Aberto" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "resolvido", rotulo: "Resolvido" },
  { valor: "cancelado", rotulo: "Cancelado" },
];
export const ABERTOS = ["aberto", "em_andamento"];

const texto = (rotulo: string, max: number) => z.string({ error: `${rotulo} é obrigatório.` }).trim().min(1, `${rotulo} é obrigatório.`).max(max);
const opcional = (max = 2000) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const uuidOpcional = z.string().trim().optional().transform((v) => (v ? v : null)).pipe(z.uuid("Seleção inválida.").nullable());
const nota = (rotulo: string) => z.coerce.number({ error: `${rotulo} inválida.` }).int().min(1, `${rotulo}: de 1 a 5.`).max(5, `${rotulo}: de 1 a 5.`);

export const problemaSchema = z.object({
  titulo: texto("Problema", 500),
  descricao: opcional(4000),
  obra_id: uuidOpcional,
  responsavel_id: uuidOpcional,
  gravidade: nota("Gravidade"),
  urgencia: nota("Urgência"),
  tendencia: nota("Tendência"),
  status: z.enum(STATUS_PROBLEMA.map((s) => s.valor) as [string, ...string[]], "Situação inválida.").default("aberto"),
});

/** Ação 5W2H. "Quando" é o prazo; "Quem", o responsável cadastrado ou um nome livre. */
export const acao5w2hSchema = z.object({
  o_que: texto("O quê", 500),
  por_que: opcional(),
  onde: opcional(500),
  prazo: z.string().trim().optional().transform((v) => (v ? v : null)).pipe(z.iso.date("Data inválida.").nullable()),
  responsavel_id: uuidOpcional,
  quem: opcional(200),
  como: opcional(),
  quanto: opcional(500),
});

/** Abas da tela: o problema sai de Pendentes quando ganha plano e de Resolvendo quando todas as ações terminam. */
export const ABAS = [
  { valor: "pendentes", rotulo: "Pendentes", status: ["aberto"], ajuda: "Ainda sem plano de ação." },
  { valor: "resolvendo", rotulo: "Resolvendo", status: ["em_andamento"], ajuda: "Com plano 5W2H em execução." },
  { valor: "concluidos", rotulo: "Concluídos", status: ["resolvido", "cancelado"], ajuda: "Todas as ações feitas, ou cancelados." },
] as const;
export const abaDe = (valor: unknown) => ABAS.find((a) => a.valor === valor) ?? ABAS[0];

/**
 * Situação do problema depois de mexer nas ações (RN-49h). Com ação, sai de Pendentes. Com todas as
 * ações concluídas, fica resolvido. Reabrir uma ação volta para Resolvendo. Cancelado não muda sozinho.
 */
export function situacaoPelasAcoes(atual: string, acoes: { status: string }[]): string {
  if (atual === "cancelado") return atual;
  const validas = acoes.filter((a) => a.status !== "cancelada");
  if (validas.length === 0) return atual === "resolvido" ? "em_andamento" : atual;
  return validas.every((a) => a.status === "concluida") ? "resolvido" : "em_andamento";
}

export type Problema = { gravidade: number; urgencia: number; tendencia: number; gut: number | null; status: string; criado_em: string };

/** Fila: em aberto primeiro, maior GUT primeiro e, no empate, o mais antigo. */
export function ordenarFila<T extends Problema>(problemas: T[]): T[] {
  const aberto = (p: Problema) => ABERTOS.includes(p.status);
  return [...problemas].sort((a, b) => Number(aberto(b)) - Number(aberto(a)) || (b.gut ?? 0) - (a.gut ?? 0) || a.criado_em.localeCompare(b.criado_em));
}

/** Resumo legível das notas: "Muito grave · Curto prazo · Aumenta". */
export const resumoGut = (p: Pick<Problema, "gravidade" | "urgencia" | "tendencia">) => `${GRAVIDADE[p.gravidade - 1]} · ${URGENCIA[p.urgencia - 1]} · ${TENDENCIA[p.tendencia - 1]}`;
