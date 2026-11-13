"use server";
import { concluirCartaoTrello } from "@cc/integrations/src/escrita.js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { podeConcluir } from "@/lib/dominio";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { UUID } from "@/lib/obras";
import { mensagemDoBanco, tarefaRapidaSchema, tarefaSchema, validar, type EstadoFormulario } from "@/lib/validacao";

function revalidarTudo() {
  revalidatePath("/tarefas", "layout");
  revalidatePath("/meu-dia");
  revalidatePath("/");
}

/**
 * Cria (id nulo) ou atualiza uma tarefa manual. Tarefas importadas (Trello…) não são
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

/** Executa a conclusão na ferramenta de origem. Os tokens ficam só no servidor (variáveis da Vercel). */
function gravarNaOrigem(fonte: string, idExterno: string): Promise<string> {
  const { TRELLO_API_KEY, TRELLO_TOKEN } = process.env;
  if (fonte !== "trello") throw new Error(`Conclusão no ${fonte} não disponível`);
  if (!TRELLO_API_KEY || !TRELLO_TOKEN) throw new Error("Gravação no Trello ainda não configurada no servidor");
  return concluirCartaoTrello({ chave: TRELLO_API_KEY, token: TRELLO_TOKEN }, idExterno);
}

/**
 * Conclui uma tarefa (RN-48). Se ela veio do Trello, conclui primeiro na origem:
 * se a ferramenta recusar, a tarefa continua aberta aqui e o erro aparece na tela.
 */
export async function concluirTarefa(id: string, _: EstadoFormulario): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(id)) return { erro: "Tarefa inválida." };

  const { data: t } = await supabase.from("tarefas").select("fonte, id_externo, responsavel_id, status").eq("id", id).maybeSingle();
  if (!t) return { erro: "Tarefa não encontrada." };
  if (!podeConcluir(t)) return { erro: "Esta tarefa não pode ser concluída aqui: é de terceiros ou já está encerrada." };

  if (t.fonte !== "manual") {
    if (!t.id_externo) return { erro: "Tarefa sem vínculo com a origem." };
    const { data: conector } = await supabase.from("conectores").select("modo, escrita_autorizada_em").eq("ferramenta", t.fonte).maybeSingle();
    if (conector?.modo !== "leitura_escrita" || !conector.escrita_autorizada_em) return { erro: `Gravação no ${t.fonte} não autorizada.` };

    const { data: operacao, error: e1 } = await supabase
      .from("operacoes_externas")
      .insert({ ferramenta: t.fonte, operacao: "concluir", registro_id: id, id_externo: t.id_externo })
      .select("id")
      .single();
    if (e1) return { erro: mensagemDoBanco(e1) };

    try {
      const detalhe = await gravarNaOrigem(t.fonte, t.id_externo);
      await supabase.from("operacoes_externas").update({ status: "sucesso", detalhe, executado_em: new Date().toISOString() }).eq("id", operacao.id);
    } catch (e) {
      const erro = e instanceof Error ? e.message : "Falha na ferramenta de origem";
      await supabase.from("operacoes_externas").update({ status: "erro", erro: erro.slice(0, 500), executado_em: new Date().toISOString() }).eq("id", operacao.id);
      return { erro: `Não concluída: ${erro}` };
    }
  }

  // hash nulo: a próxima sincronização relê a tarefa e confirma o estado vindo da origem
  const { error } = await supabase
    .from("tarefas")
    .update({ status: "concluida", concluida_em: new Date().toISOString(), aguardando_pessoa_id: null, hash_conteudo: null })
    .eq("id", id);
  if (error) return { erro: mensagemDoBanco(error) };
  revalidarTudo();
  return { ok: true };
}

export async function reabrirTarefa(id: string) {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(id)) return;
  await supabase.from("tarefas").update({ status: "a_fazer", concluida_em: null }).eq("id", id).eq("fonte", "manual");
  revalidarTudo();
}
