"use server";
import { criarCartaoDeComentario } from "@cc/integrations/src/escrita.js";
import { revalidatePath } from "next/cache";
import { QUADRO_EQUIPE } from "@/lib/equipe";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { cartaoDeComentarioSchema, mensagemDoBanco, validar, type EstadoFormulario } from "@/lib/validacao";

/** Marca ou desmarca cartão de rotina (RN-49b). Fica só no sistema: nada é gravado no Trello. */
export async function alternarRotina(tarefaId: string, marcado: boolean, _: EstadoFormulario): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(tarefaId)) return { erro: "Tarefa inválida." };
  const { error } = marcado ? await supabase.from("cartoes_rotina").delete().eq("tarefa_id", tarefaId) : await supabase.from("cartoes_rotina").insert({ tarefa_id: tarefaId });
  if (error) return { erro: mensagemDoBanco(error) };
  revalidatePath(`/tarefas/${tarefaId}`);
  revalidatePath("/equipe");
  return { ok: true };
}

/**
 * Cria um cartão no Trello a partir de um comentário (ADR 0017, RN-49).
 * O comentário e o cartão de origem não mudam, e cada comentário vira cartão uma única vez.
 */
export async function transformarEmCartao(comentarioId: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(comentarioId)) return { erro: "Comentário inválido." };
  const { dados, erros } = validar(cartaoDeComentarioSchema, fd);
  if (!dados) return { erros };

  const { TRELLO_API_KEY, TRELLO_TOKEN } = process.env;
  if (!TRELLO_API_KEY || !TRELLO_TOKEN) return { erro: "Gravação no Trello ainda não configurada no servidor." };

  const { data: comentario } = await supabase.from("trello_comentarios").select("texto, tarefas(id, id_externo, categoria)").eq("id", comentarioId).maybeSingle();
  const tarefa = comentario?.tarefas;
  if (!comentario || !tarefa?.id_externo || !tarefa.categoria?.startsWith(`${QUADRO_EQUIPE} › `)) return { erro: "Comentário não encontrado neste quadro." };

  const { data: conector } = await supabase.from("conectores").select("modo, escrita_autorizada_em").eq("ferramenta", "trello").maybeSingle();
  if (conector?.modo !== "leitura_escrita" || !conector.escrita_autorizada_em) return { erro: "Gravação no Trello não autorizada." };

  const { data: feita } = await supabase.from("operacoes_externas").select("id").eq("registro_id", comentarioId).eq("operacao", "criar").eq("status", "sucesso").limit(1);
  if (feita?.length) return { erro: "Este comentário já virou cartão." };

  const { data: operacao, error } = await supabase
    .from("operacoes_externas")
    .insert({ ferramenta: "trello", operacao: "criar", entidade: "trello_comentarios", registro_id: comentarioId, id_externo: "novo" })
    .select("id")
    .single();
  if (error) return { erro: mensagemDoBanco(error) };

  try {
    const novo = await criarCartaoDeComentario(
      { chave: TRELLO_API_KEY, token: TRELLO_TOKEN },
      { idCartaoOrigem: tarefa.id_externo, idLista: dados.lista, titulo: dados.titulo, texto: comentario.texto },
    );
    await supabase.from("operacoes_externas").update({ status: "sucesso", id_externo: novo.id, detalhe: novo.url, executado_em: new Date().toISOString() }).eq("id", operacao.id);
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Falha no Trello";
    await supabase.from("operacoes_externas").update({ status: "erro", erro: erro.slice(0, 500), executado_em: new Date().toISOString() }).eq("id", operacao.id);
    return { erro: `Não criado: ${erro}` };
  }
  revalidatePath(`/tarefas/${tarefa.id}`);
  return { ok: true, mensagem: "Cartão criado no Trello. Ele aparece aqui na próxima sincronização." };
}
