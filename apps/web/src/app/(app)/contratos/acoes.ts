"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { aditivoSchema, contratoSchema, lancamentoSchema, medicaoSituacaoSchema, mensagemDoBanco, validar, type EstadoFormulario } from "@/lib/validacao";

function revalidar(contratoId?: string) {
  revalidatePath("/contratos");
  if (contratoId) revalidatePath(`/contratos/${contratoId}`);
  revalidatePath("/planejamento", "layout");
  revalidatePath("/");
}

/** Cria (id nulo) ou altera o contrato e o caminho da planilha de medição. */
export async function salvarContrato(id: string | null, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(contratoSchema, fd);
  if (!dados) return { erros };
  const { planilha, ...contrato } = dados;

  let contratoId = id;
  if (id) {
    if (!UUID.test(id)) return { erro: "Contrato inválido." };
    const { error } = await supabase.from("contratos").update(contrato).eq("id", id);
    if (error) return { erro: mensagemDoBanco(error) };
  } else {
    const { data, error } = await supabase.from("contratos").insert(contrato).select("id").single();
    if (error) return { erro: mensagemDoBanco(error) };
    contratoId = data.id;
  }

  if (planilha) {
    const { error } = await supabase.from("medicao_arquivos").upsert({ contrato_id: contratoId as string, caminho: planilha }, { onConflict: "contrato_id" });
    if (error) return { erro: mensagemDoBanco(error) };
  }
  revalidar(contratoId as string);
  redirect(`/contratos/${contratoId}`);
}

export async function salvarAditivo(contratoId: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(contratoId)) return { erro: "Contrato inválido." };
  const { dados, erros } = validar(aditivoSchema, fd);
  if (!dados) return { erros };
  const { error } = await supabase.from("aditivos").upsert({ ...dados, contrato_id: contratoId }, { onConflict: "contrato_id,numero" });
  if (error) return { erro: mensagemDoBanco(error) };
  revalidar(contratoId);
  return { ok: true, mensagem: "Aditivo salvo." };
}

/** Situação, datas e glosa são decisão do proprietário. A planilha nunca as altera. */
export async function salvarSituacaoMedicao(id: string, contratoId: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(id) || !UUID.test(contratoId)) return { erro: "Medição inválida." };
  const { dados, erros } = validar(medicaoSituacaoSchema, fd);
  if (!dados) return { erros };
  const { error } = await supabase.from("medicoes").update(dados).eq("id", id);
  if (error) return { erro: mensagemDoBanco(error) };
  if (dados.situacao === "elaborada") {
    // Sem isto, a próxima execução veria o arquivo como igual e não atualizaria a medição
    await supabase.from("medicao_arquivos").update({ ultimo_hash: null }).eq("contrato_id", contratoId);
  }
  revalidar(contratoId);
  return { ok: true, mensagem: "Medição salva." };
}

export async function salvarLancamento(contratoId: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(contratoId)) return { erro: "Contrato inválido." };
  const { dados, erros } = validar(lancamentoSchema, fd);
  if (!dados) return { erros };
  const { error } = await supabase.from("lancamentos_financeiros").insert({ ...dados, contrato_id: contratoId });
  if (error) return { erro: mensagemDoBanco(error) };
  revalidar(contratoId);
  return { ok: true, mensagem: "Lançamento salvo." };
}
