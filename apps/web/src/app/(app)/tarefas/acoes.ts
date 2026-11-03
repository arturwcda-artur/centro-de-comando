"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { UUID } from "@/lib/obras";
import { mensagemDoBanco, tarefaRapidaSchema, tarefaSchema, validar, type EstadoFormulario } from "@/lib/validacao";

function revalidarTudo() {
  revalidatePath("/tarefas", "layout");
  revalidatePath("/meu-dia");
  revalidatePath("/");
}

/**
 * Cria (id nulo) ou atualiza uma tarefa manual. Tarefas importadas (Trello, Notion…) não são
 * editadas aqui: a fonte oficial delas é a ferramenta de origem (ADR 0004).
 */
export async function salvarTarefa(id: string | null, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(tarefaSchema, fd);
  if (!dados) return { erros };

  const concluida_em = dados.status === "concluida" ? new Date().toISOString() : null;
  const registro = { ...dados, aguardando_pessoa_id: dados.status === "aguardando_terceiro" ? dados.aguardando_pessoa_id : null };

  if (id) {
    if (!UUID.test(id)) return { erro: "Tarefa inválida." };
    const atual = await supabase.from("tarefas").select("fonte, concluida_em").eq("id", id).maybeSingle();
    if (!atual.data) return { erro: "Tarefa não encontrada." };
    if (atual.data.fonte !== "manual") return { erro: `Esta tarefa vem do ${atual.data.fonte}: altere-a na ferramenta de origem.` };
    const { error } = await supabase
      .from("tarefas")
      .update({ ...registro, concluida_em: dados.status === "concluida" ? (atual.data.concluida_em ?? concluida_em) : null })
      .eq("id", id);
    if (error) return { erro: mensagemDoBanco(error) };
  } else {
    const { error } = await supabase.from("tarefas").insert({ ...registro, concluida_em });
    if (error) return { erro: mensagemDoBanco(error) };
  }
  revalidarTudo();
  redirect("/tarefas");
}

/** Captura rápida (Meu dia): só título, prazo e obra. */
export async function criarTarefaRapida(_: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(tarefaRapidaSchema, fd);
  if (!dados) return { erros };
  const { error } = await supabase.from("tarefas").insert(dados);
  if (error) return { erro: mensagemDoBanco(error) };
  revalidarTudo();
  return { ok: true, mensagem: "Tarefa adicionada." };
}

export async function concluirTarefa(id: string) {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(id)) return;
  await supabase
    .from("tarefas")
    .update({ status: "concluida", concluida_em: new Date().toISOString(), aguardando_pessoa_id: null })
    .eq("id", id)
    .eq("fonte", "manual");
  revalidarTudo();
}

export async function reabrirTarefa(id: string) {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(id)) return;
  await supabase.from("tarefas").update({ status: "a_fazer", concluida_em: null }).eq("id", id).eq("fonte", "manual");
  revalidarTudo();
}
