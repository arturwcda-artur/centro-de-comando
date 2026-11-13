"use server";
import { criarCartaoNoQuadro } from "@cc/integrations/src/escrita.js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { QUADRO_EQUIPE } from "@/lib/equipe";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { cartaoDaAcaoSchema, mensagemDoBanco, validar, type EstadoFormulario } from "@/lib/validacao";

/**
 * Transforma uma ação 5W2H em cartão no quadro da equipe (RN-49k). Só com o clique do proprietário.
 * O cartão leva só o O quê (título), o Quem (membro) e o Quando (data); o resto do 5W2H fica no sistema.
 * A ação passa a ser o próprio cartão: o que a equipe fizer no Trello volta na sincronização,
 * e a situação do problema anda sozinha. Cada ação vira cartão uma única vez.
 */
export async function criarCartaoDaAcao(problemaId: string, acaoId: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(problemaId) || !UUID.test(acaoId)) return { erro: "Ação inválida." };
  const { dados, erros } = validar(cartaoDaAcaoSchema, fd);
  if (!dados) return { erros };

  const { TRELLO_API_KEY, TRELLO_TOKEN } = process.env;
  if (!TRELLO_API_KEY || !TRELLO_TOKEN) return { erro: "Gravação no Trello ainda não configurada no servidor." };
  const { data: conector } = await supabase.from("conectores").select("modo, escrita_autorizada_em").eq("ferramenta", "trello").maybeSingle();
  if (conector?.modo !== "leitura_escrita" || !conector.escrita_autorizada_em) return { erro: "Gravação no Trello não autorizada." };

  const { data: acao } = await supabase
    .from("tarefas")
    .select("fonte, problemas(titulo)")
    .eq("id", acaoId)
    .eq("problema_id", problemaId)
    .maybeSingle();
  if (!acao?.problemas) return { erro: "Ação não encontrada." };
  if (acao.fonte !== "manual") return { erro: "Esta ação já virou cartão no Trello." };

  const membro = dados.membro ? (await supabase.from("trello_membros").select("id, id_externo, nome").eq("id", dados.membro).maybeSingle()).data : null;
  if (dados.membro && !membro) return { erros: { membro: "Responsável não encontrado no Trello." } };

  const { data: operacao, error } = await supabase
    .from("operacoes_externas")
    .insert({ ferramenta: "trello", operacao: "criar", entidade: "tarefas", registro_id: acaoId, id_externo: "novo" })
    .select("id")
    .single();
  if (error) return { erro: mensagemDoBanco(error) };

  let novo: Awaited<ReturnType<typeof criarCartaoNoQuadro>>;
  try {
    novo = await criarCartaoNoQuadro(
      { chave: TRELLO_API_KEY, token: TRELLO_TOKEN },
      { nomeQuadro: QUADRO_EQUIPE, idLista: dados.lista, titulo: dados.titulo, prazo: dados.prazo, idMembro: membro?.id_externo, prioridade: dados.prioridade },
    );
    await supabase.from("operacoes_externas").update({ status: "sucesso", id_externo: novo.id, detalhe: novo.url, executado_em: new Date().toISOString() }).eq("id", operacao.id);
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Falha no Trello";
    await supabase.from("operacoes_externas").update({ status: "erro", erro: erro.slice(0, 500), executado_em: new Date().toISOString() }).eq("id", operacao.id);
    return { erro: `Cartão não criado: ${erro}` };
  }

  // A ação passa a ser o espelho do cartão: a sincronização atualiza esta mesma linha
  const { error: e2 } = await supabase
    .from("tarefas")
    .update({ fonte: "trello", id_externo: novo.id, titulo: dados.titulo, prazo: dados.prazo, categoria: `${QUADRO_EQUIPE} › ${novo.lista}`.slice(0, 100), status_sync: "sincronizado" })
    .eq("id", acaoId);
  if (e2) return { erro: `Cartão criado no Trello, mas a ação não foi ligada a ele: ${mensagemDoBanco(e2)}` };
  if (membro) {
    await supabase.from("tarefa_membros").upsert({ tarefa_id: acaoId, membro_id: membro.id });
    await supabase.from("acoes_detalhes").upsert({ tarefa_id: acaoId, quem: membro.nome });
  }

  revalidatePath(`/problemas/${problemaId}`);
  revalidatePath("/tarefas");
  redirect(`/problemas/${problemaId}`);
}
