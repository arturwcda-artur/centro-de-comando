"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UUID } from "@/lib/obras";
import { acao5w2hSchema, problemaSchema } from "@/lib/problemas";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { mensagemDoBanco, validar, type EstadoFormulario } from "@/lib/validacao";

function revalidar(id?: string) {
  revalidatePath("/problemas");
  if (id) revalidatePath(`/problemas/${id}`);
  revalidatePath("/tarefas");
  revalidatePath("/");
}

/** Cria (id nulo) ou altera um problema (RN-49h). */
export async function salvarProblema(id: string | null, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(problemaSchema, fd);
  if (!dados) return { erros };

  let destino: string;
  if (id) {
    if (!UUID.test(id)) return { erro: "Problema inválido." };
    const { data: atual } = await supabase.from("problemas").select("resolvido_em").eq("id", id).maybeSingle();
    if (!atual) return { erro: "Problema não encontrado." };
    const resolvido_em = dados.status === "resolvido" ? (atual.resolvido_em ?? new Date().toISOString()) : null;
    const { error } = await supabase.from("problemas").update({ ...dados, resolvido_em }).eq("id", id);
    if (error) return { erro: mensagemDoBanco(error) };
    destino = id;
  } else {
    const resolvido_em = dados.status === "resolvido" ? new Date().toISOString() : null;
    const { data, error } = await supabase.from("problemas").insert({ ...dados, resolvido_em }).select("id").single();
    if (error) return { erro: mensagemDoBanco(error) };
    destino = data.id;
  }
  revalidar(destino);
  redirect(`/problemas/${destino}`);
}

/** Cria (acaoId nulo) ou altera uma ação 5W2H do problema. A ação é uma tarefa comum, com o 5W2H ao lado. */
export async function salvarAcao5w2h(problemaId: string, acaoId: string | null, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(problemaId) || (acaoId && !UUID.test(acaoId))) return { erro: "Ação inválida." };
  const { dados, erros } = validar(acao5w2hSchema, fd);
  if (!dados) return { erros };

  const { data: problema } = await supabase.from("problemas").select("id, obra_id, gravidade, urgencia, tendencia, gut").eq("id", problemaId).maybeSingle();
  if (!problema) return { erro: "Problema não encontrado." };

  const tarefa = {
    titulo: dados.o_que,
    obra_id: problema.obra_id,
    prazo: dados.prazo,
    responsavel_id: dados.responsavel_id,
    importancia: problema.gravidade,
    impacto: problema.tendencia,
    critica: (problema.gut ?? 0) >= 64,
    problema_id: problemaId,
  };
  let tarefaId = acaoId;
  if (acaoId) {
    const { error } = await supabase.from("tarefas").update(tarefa).eq("id", acaoId).eq("problema_id", problemaId);
    if (error) return { erro: mensagemDoBanco(error) };
  } else {
    const { data, error } = await supabase.from("tarefas").insert({ ...tarefa, tipo: "acao", categoria: "Problemas" }).select("id").single();
    if (error) return { erro: mensagemDoBanco(error) };
    tarefaId = data.id;
  }
  const { error } = await supabase
    .from("acoes_detalhes")
    .upsert({ tarefa_id: tarefaId as string, o_que: dados.o_que, por_que: dados.por_que, onde: dados.onde, quem: dados.quem, como: dados.como, quanto: dados.quanto }, { onConflict: "tarefa_id" });
  if (error) return { erro: mensagemDoBanco(error) };

  // Problema com ação planejada sai de "aberto"
  await supabase.from("problemas").update({ status: "em_andamento" }).eq("id", problemaId).eq("status", "aberto");
  revalidar(problemaId);
  redirect(`/problemas/${problemaId}`);
}

/** Conclui ou reabre uma ação do problema. */
export async function alternarAcao(problemaId: string, acaoId: string, concluir: boolean) {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(problemaId) || !UUID.test(acaoId)) return;
  await supabase
    .from("tarefas")
    .update(concluir ? { status: "concluida", concluida_em: new Date().toISOString() } : { status: "a_fazer", concluida_em: null })
    .eq("id", acaoId)
    .eq("problema_id", problemaId);
  revalidar(problemaId);
}
