"use server";
import { revalidatePath } from "next/cache";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { executadoAnteriorSchema, mensagemDoBanco, validar, type EstadoFormulario } from "@/lib/validacao";

/** Ponto de partida da Curva S vigente. Na Fase 7, passa a vir das medições. */
export async function salvarExecutadoAnterior(arquivoId: string, obraId: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(arquivoId)) return { erro: "Arquivo inválido." };
  const { dados, erros } = validar(executadoAnteriorSchema, fd);
  if (!dados) return { erros };
  const { error } = await supabase
    .from("cronograma_arquivos")
    .update({ valor_executado_anterior: dados.valor, data_executado_anterior: dados.data })
    .eq("id", arquivoId)
    .eq("papel", "vigente");
  if (error) return { erro: mensagemDoBanco(error) };
  revalidatePath(`/planejamento/${obraId}`);
  return { ok: true, mensagem: "Valor salvo." };
}

/** A linha de base só muda por esta ação do proprietário (RN-68). */
export async function tornarLinhaBase(versaoId: string, obraId: string, _: EstadoFormulario): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(versaoId)) return { erro: "Versão inválida." };
  const { error } = await supabase.rpc("tornar_linha_base", { p_versao: versaoId });
  if (error) return { erro: mensagemDoBanco(error) };
  revalidatePath(`/planejamento/${obraId}`);
  return { ok: true };
}
