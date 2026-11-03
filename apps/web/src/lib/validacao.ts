import { z } from "zod";
import { STATUS_DECISAO, STATUS_RISCO, SITUACOES_OBRA, UFS } from "@/lib/dominio";

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
