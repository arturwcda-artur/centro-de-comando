import { z } from "zod";
import { CATEGORIAS_NOTION, PRIORIDADES_NOTION, SITUACOES_ADITIVO, SITUACOES_MEDICAO, STATUS_DECISAO, STATUS_RISCO, TIPOS_ADITIVO, TIPOS_LANCAMENTO, STATUS_TAREFA, SITUACOES_OBRA, TIPOS_TAREFA, UFS } from "@/lib/dominio";

/** Valida os formulários no servidor (nunca confiar no navegador). Campos vazios viram null. */

const texto = (rotulo: string, max = 200) =>
  z.string({ error: `${rotulo} é obrigatório.` }).trim().min(1, `${rotulo} é obrigatório.`).max(max, `${rotulo}: no máximo ${max} caracteres.`);
const textoOpcional = (max = 2000) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const uuidOpcional = z.string().trim().optional().transform((v) => (v ? v : null)).pipe(z.uuid("Seleção inválida.").nullable());
const dataOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.iso.date("Data inválida.").nullable());
const nota15 = (rotulo: string) => z.coerce.number({ error: `${rotulo} inválido.` }).int().min(1, `${rotulo}: de 1 a 5.`).max(5, `${rotulo}: de 1 a 5.`);
const cnpj = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.replace(/\D/g, "") : null))
  .refine((v) => v === null || v.length === 14, "CNPJ deve ter 14 dígitos.");
const uf = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v.toUpperCase() : null))
  .refine((v) => v === null || (UFS as readonly string[]).includes(v), "UF inválida.");
const codigo = z
  .string({ error: "Código é obrigatório." })
  .trim()
  .min(1, "Código é obrigatório.")
  .max(30, "Código: no máximo 30 caracteres.")
  .transform((v) => v.toUpperCase())
  .refine((v) => /^[A-Z0-9][A-Z0-9-]*$/.test(v), "Código: use letras, números e hífen.");

const situacoes = SITUACOES_OBRA.map((s) => s.valor) as [string, ...string[]];

export const obraSchema = z
  .object({
    codigo,
    nome: texto("Nome"),
    situacao: z.enum(situacoes, "Situação inválida."),
    empresa_id: uuidOpcional,
    contratante_id: uuidOpcional,
    endereco: textoOpcional(300),
    cidade: textoOpcional(100),
    uf,
    data_inicio: dataOpcional,
    data_termino_prevista: dataOpcional,
    pasta_local: textoOpcional(500),
    planilha_acoes: textoOpcional(500),
    observacoes: textoOpcional(),
  })
  .refine((o) => !o.data_inicio || !o.data_termino_prevista || o.data_termino_prevista >= o.data_inicio, {
    message: "O término previsto não pode ser antes do início.",
    path: ["data_termino_prevista"],
  });

export const empresaSchema = z.object({
  razao_social: texto("Razão social"),
  nome_fantasia: textoOpcional(200),
  cnpj,
  observacoes: textoOpcional(),
});

export const contratanteSchema = z.object({
  nome: texto("Nome"),
  tipo: z.enum(["publico", "privado"], "Tipo inválido."),
  orgao: textoOpcional(200),
  cnpj,
  observacoes: textoOpcional(),
});

export const pessoaSchema = z.object({
  nome: texto("Nome"),
  funcao: textoOpcional(120),
  empresa_id: uuidOpcional,
  email: z.string().trim().optional().transform((v) => (v ? v : null)).pipe(z.email("E-mail inválido.").nullable()),
  telefone: textoOpcional(40),
  eh_usuario: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export const fornecedorSchema = z.object({
  razao_social: texto("Razão social"),
  nome_fantasia: textoOpcional(200),
  cnpj,
  especialidade: textoOpcional(200),
  contato: textoOpcional(200),
});

export const riscoSchema = z.object({
  obra_id: z.uuid("Obra inválida."),
  descricao: texto("Descrição", 1000),
  origem: textoOpcional(200),
  categoria: textoOpcional(100),
  probabilidade: nota15("Probabilidade"),
  impacto: nota15("Impacto"),
  responsavel_id: uuidOpcional,
  prazo: dataOpcional,
  plano_resposta: textoOpcional(),
  status: z.enum(STATUS_RISCO.map((s) => s.valor) as [string, ...string[]]).default("aberto"),
});

export const decisaoSchema = z
  .object({
    obra_id: z.uuid("Obra inválida."),
    problema: texto("Problema", 1000),
    decisao: textoOpcional(),
    responsavel_id: uuidOpcional,
    prazo: dataOpcional,
    status: z.enum(STATUS_DECISAO.map((s) => s.valor) as [string, ...string[]]).default("pendente"),
    data_decisao: dataOpcional,
    resultado: textoOpcional(),
  })
  .refine((d) => d.status !== "tomada" || !!d.decisao, { message: "Registre o texto da decisão (RN-51).", path: ["decisao"] });

export const tarefaSchema = z
  .object({
    titulo: texto("Título", 300),
    descricao: textoOpcional(4000),
    obra_id: uuidOpcional,
    responsavel_id: uuidOpcional,
    aguardando_pessoa_id: uuidOpcional,
    tipo: z.enum(TIPOS_TAREFA.map((s) => s.valor) as [string, ...string[]], "Tipo inválido.").default("acao"),
    categoria: textoOpcional(100),
    prazo: dataOpcional,
    importancia: nota15("Importância").default(3),
    impacto: nota15("Impacto").default(3),
    critica: z
      .string()
      .optional()
      .transform((v) => v === "on" || v === "true"),
    status: z.enum(STATUS_TAREFA.map((s) => s.valor) as [string, ...string[]], "Situação inválida.").default("a_fazer"),
  })
  .refine((t) => t.status !== "aguardando_terceiro" || !!t.aguardando_pessoa_id, {
    message: "Informe de quem a tarefa está aguardando (RN-44).",
    path: ["aguardando_pessoa_id"],
  });

export const tarefaRapidaSchema = z.object({
  titulo: texto("Título", 300),
  prazo: dataOpcional,
  obra_id: uuidOpcional,
});

const horaOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "Horário inválido.");

export const compromissoSchema = z
  .object({
    titulo: texto("Título", 300),
    data: z.iso.date("Data inválida."),
    data_fim: dataOpcional,
    dia_inteiro: z.string().optional().transform((v) => v === "on"),
    inicio: horaOpcional,
    fim: horaOpcional,
    local: textoOpcional(300),
    descricao: textoOpcional(4000),
    obra_id: uuidOpcional,
  })
  .transform((c) => ({ ...c, data_fim: c.data_fim ?? c.data }))
  .superRefine((c, ctx) => {
    if (c.data_fim < c.data) ctx.addIssue({ code: "custom", path: ["data_fim"], message: "A data final não pode ser antes da inicial." });
    if (c.dia_inteiro) return;
    if (!c.inicio) ctx.addIssue({ code: "custom", path: ["inicio"], message: "Informe o horário de início." });
    if (!c.fim) ctx.addIssue({ code: "custom", path: ["fim"], message: "Informe o horário de término." });
    if (c.inicio && c.fim && c.data_fim === c.data && c.fim <= c.inicio) ctx.addIssue({ code: "custom", path: ["fim"], message: "O término deve ser depois do início." });
  });

export const executadoAnteriorSchema = z.object({
  valor: z.coerce.number({ error: "Valor inválido." }).min(0, "O valor não pode ser negativo."),
  data: z.iso.date("Informe a data de referência."),
});

const valores = (lista: readonly { valor: string }[]) => lista.map((x) => x.valor) as [string, ...string[]];
const dinheiro = (rotulo: string) => z.coerce.number({ error: `${rotulo} inválido.` }).min(0, `${rotulo} não pode ser negativo.`);
const inteiroOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? Number(v) : null))
  .refine((v) => v === null || (Number.isInteger(v) && v > 0), "Informe um número inteiro maior que zero.");

export const contratoSchema = z
  .object({
    obra_id: z.uuid("Selecione a obra."),
    contratante_id: uuidOpcional,
    numero: texto("Número", 60),
    objeto: textoOpcional(1000),
    modalidade: textoOpcional(100),
    regime: textoOpcional(100),
    data_assinatura: dataOpcional,
    data_inicio: dataOpcional,
    prazo_original_dias: inteiroOpcional,
    data_termino_original: dataOpcional,
    valor_original: dinheiro("Valor"),
    indice_reajuste: textoOpcional(100),
    data_base: dataOpcional,
    planilha: textoOpcional(500),
  })
  .refine((c) => !c.data_inicio || !c.data_termino_original || c.data_termino_original >= c.data_inicio, {
    message: "O término não pode ser antes do início.",
    path: ["data_termino_original"],
  });

export const aditivoSchema = z
  .object({
    numero: texto("Número", 60),
    tipo: z.enum(valores(TIPOS_ADITIVO), "Tipo inválido."),
    valor_delta: z.coerce.number({ error: "Valor inválido." }),
    dias_delta: z.coerce.number({ error: "Dias inválidos." }).int("Use um número inteiro de dias."),
    data_assinatura: dataOpcional,
    justificativa: textoOpcional(2000),
    situacao: z.enum(valores(SITUACOES_ADITIVO), "Situação inválida."),
  })
  .superRefine((a, ctx) => {
    const erro = (message: string) => ctx.addIssue({ code: "custom", path: ["valor_delta"], message });
    if (a.tipo === "supressao" && a.valor_delta > 0) erro("Supressão tem valor negativo ou zero (RN-18).");
    if ((a.tipo === "acrescimo" || a.tipo === "reajuste") && a.valor_delta < 0) erro("Acréscimo e reajuste não têm valor negativo (RN-18).");
    if (a.tipo === "prazo" && a.valor_delta !== 0) erro("Aditivo só de prazo tem valor zero (RN-18).");
  });

export const medicaoSituacaoSchema = z.object({
  situacao: z.enum(valores(SITUACOES_MEDICAO), "Situação inválida."),
  data_envio: dataOpcional,
  data_aprovacao: dataOpcional,
  valor_glosado: dinheiro("Glosa"),
});

export const lancamentoSchema = z
  .object({
    tipo: z.enum(valores(TIPOS_LANCAMENTO), "Tipo inválido."),
    valor: dinheiro("Valor"),
    data_prevista: dataOpcional,
    data_efetiva: dataOpcional,
    nota_fiscal: textoOpcional(60),
    medicao_id: uuidOpcional,
    observacoes: textoOpcional(1000),
  })
  .refine((l) => l.data_prevista || l.data_efetiva, { message: "Informe a data prevista ou a efetiva.", path: ["data_prevista"] });

export const cartaoDeComentarioSchema = z.object({
  titulo: texto("Título", 300),
  lista: texto("Lista", 40),
});

export const demandaNotionSchema = z.object({
  titulo: texto("Demanda", 300),
  prioridade: z.enum(valores(PRIORIDADES_NOTION), "Prioridade inválida."),
  categoria: z.enum(valores(CATEGORIAS_NOTION), "Categoria inválida."),
  prazo: dataOpcional,
  responsavel: textoOpcional(200),
  observacoes: textoOpcional(2000),
});

export const aprovacaoSchema = z.object({
  proposta_id: z.uuid(),
  codigo,
  nome: texto("Nome"),
  situacao: z.enum(situacoes, "Situação inválida."),
  empresa_id: uuidOpcional,
  nova_empresa: textoOpcional(200),
  contratante_id: uuidOpcional,
  novo_contratante: textoOpcional(200),
  cidade: textoOpcional(100),
  uf,
});

export type Erros = Partial<Record<string, string>>;
export type EstadoFormulario = { ok?: boolean; erro?: string; erros?: Erros; mensagem?: string };

/** Lê o FormData com o schema; devolve dados ou os erros por campo. */
export function validar<S extends z.ZodType>(schema: S, dados: FormData | Record<string, unknown>) {
  const objeto = dados instanceof FormData ? Object.fromEntries(dados) : dados;
  const r = schema.safeParse(objeto);
  if (r.success) return { dados: r.data as z.output<S>, erros: null };
  const erros: Erros = {};
  for (const problema of r.error.issues) {
    const campo = String(problema.path[0] ?? "_");
    erros[campo] ??= problema.message;
  }
  return { dados: null, erros };
}

/** Traduz erros do Postgres/Supabase para mensagens úteis. */
export function mensagemDoBanco(erro: { code?: string; message?: string } | null): string {
  if (!erro) return "Erro desconhecido.";
  if (erro.code === "23505") {
    if (erro.message?.includes("codigo")) return "Já existe uma obra com esse código.";
    if (erro.message?.includes("cnpj")) return "Já existe um cadastro com esse CNPJ.";
    return "Registro duplicado.";
  }
  if (erro.code === "23503") return "Não é possível: há registros vinculados.";
  if (erro.code === "23514") return "Algum valor não atende às regras do cadastro.";
  if (erro.code === "P0002") return "Essa proposta já foi revisada.";
  if (erro.code === "42501") return "Sem permissão. Entre novamente com o autenticador.";
  return "Não foi possível salvar. Tente novamente.";
}
