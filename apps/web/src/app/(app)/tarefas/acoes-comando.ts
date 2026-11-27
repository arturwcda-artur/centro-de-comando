"use server";
import { criarCartaoNoQuadro } from "@cc/integrations/src/escrita.js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { QUADROS_EQUIPE } from "@/lib/equipe";
import { hojeSP } from "@/lib/formato";
import { adiamentoValido, descricaoNaoSeAplica } from "@/lib/mesa-acoes";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { delegarSchema, mensagemDoBanco, naoSeAplicaSchema, validar, type EstadoFormulario } from "@/lib/validacao";
import { criarLembreteDeAcao } from "../agenda/acoes";

/**
 * Os 4 botões de comando na tarefa (Doutrina do Centro de Comando, RN-49q): Fazer eu, Delegar,
 * Adiar e Não se aplica mais. Valem para tarefa criada no sistema e ainda aberta.
 * Nada vai para o Trello sem o clique em Delegar.
 */

type Cliente = Awaited<ReturnType<typeof exigirSessaoCompleta>>["supabase"];

async function tarefaAberta(supabase: Cliente, id: string) {
  const { data } = await supabase.from("tarefas").select("id, titulo, descricao, obra_id, problema_id, fonte, status, trello_cartao_id").eq("id", id).maybeSingle();
  if (!data) return { erro: "Tarefa não encontrada." } as const;
  if (data.fonte !== "manual") return { erro: "Esta tarefa já é um cartão no Trello." } as const;
  if (data.status === "concluida" || data.status === "cancelada") return { erro: "Esta tarefa já foi encerrada." } as const;
  return { tarefa: data } as const;
}

function revalidar(id: string) {
  revalidatePath(`/tarefas/${id}`);
  revalidatePath("/tarefas");
  revalidatePath("/meu-dia");
  revalidatePath("/");
}

/** "Fazer eu": a tarefa passa para o gestor e ganha um horário reservado na Agenda dele. */
export async function fazerEu(id: string, estado: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  if (!UUID.test(id)) return { erro: "Tarefa inválida." };
  const { supabase } = await exigirSessaoCompleta();
  const r = await tarefaAberta(supabase, id);
  if ("erro" in r) return { erro: r.erro };
  const resultado = await criarLembreteDeAcao(id, estado, fd);
  if (!resultado.ok) return resultado;
  const { data: eu } = await supabase.from("pessoas").select("id").eq("eh_usuario", true).is("arquivado_em", null).limit(1).maybeSingle();
  await supabase.from("tarefas").update({ responsavel_id: eu?.id ?? null }).eq("id", id);
  revalidar(id);
  return { ok: true, mensagem: `${resultado.mensagem} A tarefa ficou com você.` };
}

/**
 * "Delegar": a própria tarefa vira cartão no quadro da equipe, com o título e a descrição digitados
 * pelo gestor. Daí em diante ela acompanha o cartão: concluir no Trello fecha a tarefa.
 * Cartão espelho antigo do quadro pessoal (até 27/11/2026) muda de quadro em vez de duplicar.
 */
export async function delegarTarefa(id: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  if (!UUID.test(id)) return { erro: "Tarefa inválida." };
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(delegarSchema, fd);
  if (!dados) return { erros };
  const nomeQuadro = QUADROS_EQUIPE[dados.quadro];
  if (!nomeQuadro) return { erros: { quadro: "Escolha o quadro." } };

  const { TRELLO_API_KEY, TRELLO_TOKEN } = process.env;
  if (!TRELLO_API_KEY || !TRELLO_TOKEN) return { erro: "Gravação no Trello ainda não configurada no servidor." };
  const { data: conector } = await supabase.from("conectores").select("modo, escrita_autorizada_em").eq("ferramenta", "trello").maybeSingle();
  if (conector?.modo !== "leitura_escrita" || !conector.escrita_autorizada_em) return { erro: "Gravação no Trello não autorizada." };

  const r = await tarefaAberta(supabase, id);
  if ("erro" in r) return { erro: r.erro };
  const { data: membro } = await supabase.from("trello_membros").select("id, id_externo, nome, pessoa_id").eq("id", dados.membro).maybeSingle();
  if (!membro) return { erros: { membro: "Pessoa não encontrada no Trello." } };

  const { data: operacao } = await supabase
    .from("operacoes_externas")
    .insert({ ferramenta: "trello", operacao: "criar", entidade: "tarefas", registro_id: id, id_externo: "novo" })
    .select("id")
    .single();
  let novo: Awaited<ReturnType<typeof criarCartaoNoQuadro>>;
  try {
    novo = await criarCartaoNoQuadro(
      { chave: TRELLO_API_KEY, token: TRELLO_TOKEN },
      { nomeQuadro, idLista: dados.lista, titulo: dados.titulo, descricao: dados.descricao ?? undefined, prazo: dados.prazo, idMembro: membro.id_externo, prioridade: dados.prioridade, idCartaoExistente: r.tarefa.trello_cartao_id },
    );
  } catch (e) {
    const detalhe = e instanceof Error ? e.message : "Falha no Trello";
    if (operacao) await supabase.from("operacoes_externas").update({ status: "erro", erro: detalhe.slice(0, 500), executado_em: new Date().toISOString() }).eq("id", operacao.id);
    return { erro: "Não foi possível criar o cartão no Trello agora." };
  }
  if (operacao) await supabase.from("operacoes_externas").update({ status: "sucesso", id_externo: novo.id, detalhe: novo.url, executado_em: new Date().toISOString() }).eq("id", operacao.id);

  // A tarefa passa a ser o espelho do cartão: a sincronização atualiza esta mesma linha
  const { error } = await supabase
    .from("tarefas")
    .update({
      fonte: "trello",
      id_externo: novo.id,
      titulo: dados.titulo,
      prazo: dados.prazo,
      responsavel_id: membro.pessoa_id,
      categoria: `${nomeQuadro} › ${novo.lista}`.slice(0, 100),
      status_sync: "sincronizado",
      trello_cartao_id: null,
    })
    .eq("id", id);
  if (error) return { erro: `Cartão criado no Trello, mas a tarefa não foi ligada a ele: ${mensagemDoBanco(error)}` };
  await supabase.from("tarefa_membros").upsert({ tarefa_id: id, membro_id: membro.id });
  if (r.tarefa.problema_id) await supabase.from("acoes_detalhes").upsert({ tarefa_id: id, quem: membro.nome });

  revalidar(id);
  redirect(`/tarefas/${id}`);
}

/** "Adiar": o prazo passa para a data escolhida, sempre depois de hoje. */
export async function adiarTarefa(id: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  if (!UUID.test(id)) return { erro: "Tarefa inválida." };
  const data = String(fd.get("adiar_ate") ?? "");
  if (!adiamentoValido(data, hojeSP())) return { erros: { adiar_ate: "Escolha uma data depois de hoje." } };
  const { supabase } = await exigirSessaoCompleta();
  const r = await tarefaAberta(supabase, id);
  if ("erro" in r) return { erro: r.erro };
  const { error } = await supabase.from("tarefas").update({ prazo: data }).eq("id", id);
  if (error) return { erro: mensagemDoBanco(error) };
  revalidar(id);
  return { ok: true, mensagem: `Adiada para ${data.split("-").reverse().join("/")}.` };
}

/** "Não se aplica mais": a tarefa é encerrada como cancelada, com o motivo registrado na descrição. */
export async function naoSeAplicaTarefa(id: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  if (!UUID.test(id)) return { erro: "Tarefa inválida." };
  const { dados, erros } = validar(naoSeAplicaSchema, fd);
  if (!dados) return { erros };
  const { supabase } = await exigirSessaoCompleta();
  const r = await tarefaAberta(supabase, id);
  if ("erro" in r) return { erro: r.erro };
  const { error } = await supabase
    .from("tarefas")
    .update({ status: "cancelada", aguardando_pessoa_id: null, descricao: descricaoNaoSeAplica(r.tarefa.descricao, dados.motivo, hojeSP()) })
    .eq("id", id);
  if (error) return { erro: mensagemDoBanco(error) };
  revalidar(id);
  redirect(`/tarefas/${id}`);
}
