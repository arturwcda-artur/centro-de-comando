"use server";
import { revalidatePath } from "next/cache";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { UUID } from "@/lib/obras";
import {
  contratanteSchema,
  empresaSchema,
  fornecedorSchema,
  mensagemDoBanco,
  pessoaSchema,
  validar,
  type EstadoFormulario,
} from "@/lib/validacao";

const SCHEMAS = {
  empresas: empresaSchema,
  contratantes: contratanteSchema,
  pessoas: pessoaSchema,
  fornecedores: fornecedorSchema,
} as const;
export type TabelaCadastro = keyof typeof SCHEMAS;

export async function salvarCadastro(tabela: TabelaCadastro, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!(tabela in SCHEMAS)) return { erro: "Cadastro inválido." };
  const { dados, erros } = validar(SCHEMAS[tabela], fd);
  if (!dados) return { erros };
  // O tipo de cada tabela é garantido pelo schema correspondente
  const { error } = await supabase.from(tabela).insert(dados as never);
  if (error) return { erro: mensagemDoBanco(error) };
  revalidatePath("/cadastros");
  return { ok: true, mensagem: "Cadastro salvo." };
}

export async function arquivarCadastro(tabela: TabelaCadastro, id: string) {
  const { supabase } = await exigirSessaoCompleta();
  if (!(tabela in SCHEMAS) || !UUID.test(id)) return;
  await supabase.from(tabela).update({ arquivado_em: new Date().toISOString() }).eq("id", id);
  revalidatePath("/cadastros");
}
