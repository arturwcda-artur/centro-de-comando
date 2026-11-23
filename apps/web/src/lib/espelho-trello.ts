import "server-only";
import { comentarNoCartao, espelharTarefa, lerQuadroPessoal } from "@cc/integrations/src/espelho.js";
import type { criarClienteServidor } from "@/lib/supabase/servidor";

type Cliente = Awaited<ReturnType<typeof criarClienteServidor>>;

/**
 * Leva ao quadro pessoal "tarefas" do Trello as tarefas criadas no sistema (RN-49l): cria o cartão
 * da tarefa aberta que ainda não tem e atualiza título, data e lista das demais. Nunca impede a
 * gravação aqui: se o Trello falhar, fica registrado e a sincronização tenta de novo.
 */
export async function espelharNoTrello(supabase: Cliente, ids: string[], comentario?: string) {
  const { TRELLO_API_KEY, TRELLO_TOKEN } = process.env;
  if (!ids.length || !TRELLO_API_KEY || !TRELLO_TOKEN) return;
  const { data: conector } = await supabase.from("conectores").select("modo, escrita_autorizada_em").eq("ferramenta", "trello").maybeSingle();
  if (conector?.modo !== "leitura_escrita" || !conector.escrita_autorizada_em) return;
  const { data: tarefas } = await supabase.from("tarefas").select("id, titulo, prazo, status, trello_cartao_id").in("id", ids).eq("fonte", "manual").neq("status", "cancelada");
  const alvo = (tarefas ?? []).filter((t) => t.trello_cartao_id || t.status !== "concluida");
  if (!alvo.length) return;

  const cred = { chave: TRELLO_API_KEY, token: TRELLO_TOKEN };
  let quadro: Awaited<ReturnType<typeof lerQuadroPessoal>>;
  try {
    quadro = await lerQuadroPessoal(cred);
  } catch (e) {
    await registrar(supabase, alvo[0].id, alvo[0].trello_cartao_id, e);
    return;
  }
  for (const t of alvo) {
    try {
      const id = await espelharTarefa(cred, quadro, t);
      if (!t.trello_cartao_id) await supabase.from("tarefas").update({ trello_cartao_id: id }).eq("id", t.id);
      if (comentario) await comentarNoCartao(cred, id, comentario);
      await registrar(supabase, t.id, id);
    } catch (e) {
      await registrar(supabase, t.id, t.trello_cartao_id, e);
    }
  }
}

async function registrar(supabase: Cliente, tarefaId: string, idCartao: string | null, erro?: unknown) {
  await supabase.from("operacoes_externas").insert({
    ferramenta: "trello",
    operacao: idCartao ? "alterar" : "criar",
    entidade: "tarefas",
    registro_id: tarefaId,
    id_externo: idCartao ?? "novo",
    status: erro ? "erro" : "sucesso",
    detalhe: erro ? null : "quadro tarefas",
    erro: erro ? (erro instanceof Error ? erro.message : "Falha no Trello").slice(0, 500) : null,
    executado_em: new Date().toISOString(),
  });
}
