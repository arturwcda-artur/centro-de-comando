"use server";
import { criarCartaoNoQuadro } from "@cc/integrations/src/escrita.js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { QUADROS_EQUIPE } from "@/lib/equipe";
import { acrescentarResultado, resultadoDecidido, resultadoDelegado, resultadoNaoSeAplica, textoDaDecisaoAoDelegar } from "@/lib/mesa-acoes";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { UUID } from "@/lib/obras";
import { decididoSchema, delegarSchema, mensagemDoBanco, naoSeAplicaSchema, validar, type EstadoFormulario } from "@/lib/validacao";
import { hojeSP } from "@/lib/formato";

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** "Decidido": grava a decisão com quem decidiu e quando (pode ter sido fora da Mesa). */
export async function decidirItem(id: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  if (!UUID.test(id)) return { erro: "Item inválido." };
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(decididoSchema, fd);
  if (!dados) return { erros };
  let nome: string | null = null;
  if (dados.quem !== "eu") {
    const { data: pessoa } = await supabase.from("pessoas").select("nome").eq("id", dados.quem).is("arquivado_em", null).maybeSingle();
    if (!pessoa) return { erros: { quem: "Pessoa não encontrada." } };
    nome = pessoa.nome;
  }
  const { data: atual } = await supabase.from("decisoes").select("status").eq("id", id).maybeSingle();
  if (atual?.status !== "pendente") return { erro: "Este item já foi tratado." };
  const { error } = await supabase
    .from("decisoes")
    .update({ decisao: dados.decisao, status: "tomada", data_decisao: dados.quando, afeta_planejamento: dados.afeta_planejamento, resultado: resultadoDecidido(nome) })
    .eq("id", id);
  if (error) return { erro: mensagemDoBanco(error) };
  revalidatePath("/");
  // Gerar ação: abre o Delegar logo em seguida, com a decisão já tomada
  redirect(dados.gerar_acao ? `/?item=${id}&delegar=1` : "/");
}

/** "Não se aplica mais": o item sai da Mesa, com o motivo registrado. */
export async function naoSeAplicaItem(id: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  if (!UUID.test(id)) return { erro: "Item inválido." };
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(naoSeAplicaSchema, fd);
  if (!dados) return { erros };
  const { data: atual } = await supabase.from("decisoes").select("status").eq("id", id).maybeSingle();
  if (atual?.status !== "pendente") return { erro: "Este item já foi tratado." };
  const { error } = await supabase.from("decisoes").update({ status: "cancelada", resultado: resultadoNaoSeAplica(dados.motivo) }).eq("id", id);
  if (error) return { erro: mensagemDoBanco(error) };
  revalidatePath("/");
  redirect("/");
}

const ERRO_TRELLO = "Não foi possível criar o cartão no Trello agora.";

/**
 * "Delegar": só com o clique do gestor, cria a tarefa e o cartão no quadro da equipe. Título e descrição
 * são os digitados por ele. A tarefa vira o espelho do cartão, então concluir no Trello fecha a tarefa.
 * Se o Trello falhar, nada fica pela metade: a tarefa criada é apagada.
 */
export async function delegarParaEquipe(id: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  if (!UUID.test(id)) return { erro: "Item inválido." };
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(delegarSchema, fd);
  if (!dados) return { erros };
  const nomeQuadro = QUADROS_EQUIPE[dados.quadro];
  if (!nomeQuadro) return { erros: { quadro: "Escolha o quadro." } };

  const { TRELLO_API_KEY, TRELLO_TOKEN } = process.env;
  if (!TRELLO_API_KEY || !TRELLO_TOKEN) return { erro: ERRO_TRELLO };
  const { data: conector } = await supabase.from("conectores").select("modo, escrita_autorizada_em").eq("ferramenta", "trello").maybeSingle();
  if (conector?.modo !== "leitura_escrita" || !conector.escrita_autorizada_em) return { erro: ERRO_TRELLO };

  const { data: d } = await supabase.from("decisoes").select("obra_id, status, decisao, resultado").eq("id", id).maybeSingle();
  if (!d || (d.status !== "pendente" && d.status !== "tomada")) return { erro: "Este item já foi tratado." };

  const { data: membro } = await supabase.from("trello_membros").select("id, id_externo, nome, pessoa_id").eq("id", dados.membro).maybeSingle();
  if (!membro) return { erros: { membro: "Pessoa não encontrada no Trello." } };
  if (!membro.pessoa_id) return { erros: { membro: "Esta pessoa do Trello ainda não está ligada a um cadastro de pessoa." } };

  // a) a tarefa, ainda como manual; só vira espelho do cartão depois que ele existir
  const { data: t, error: erroTarefa } = await supabase
    .from("tarefas")
    .insert({ titulo: dados.titulo, obra_id: d.obra_id, responsavel_id: membro.pessoa_id, prazo: dados.prazo, fonte: "manual", tipo: "acao" })
    .select("id")
    .single();
  if (erroTarefa || !t) return { erro: mensagemDoBanco(erroTarefa) };

  const { data: operacao } = await supabase
    .from("operacoes_externas")
    .insert({ ferramenta: "trello", operacao: "criar", entidade: "tarefas", registro_id: t.id, id_externo: "novo" })
    .select("id")
    .single();

  // b) o cartão, com a descrição digitada
  let novo: Awaited<ReturnType<typeof criarCartaoNoQuadro>>;
  try {
    novo = await criarCartaoNoQuadro(
      { chave: TRELLO_API_KEY, token: TRELLO_TOKEN },
      { nomeQuadro, idLista: dados.lista, titulo: dados.titulo, descricao: dados.descricao ?? undefined, prazo: dados.prazo, idMembro: membro.id_externo, prioridade: dados.prioridade },
    );
  } catch (e) {
    const detalhe = e instanceof Error ? e.message : "Falha no Trello";
    if (operacao) await supabase.from("operacoes_externas").update({ status: "erro", erro: detalhe.slice(0, 500), executado_em: new Date().toISOString() }).eq("id", operacao.id);
    await supabase.from("tarefas").delete().eq("id", t.id);
    return { erro: ERRO_TRELLO };
  }
  if (operacao) await supabase.from("operacoes_externas").update({ status: "sucesso", id_externo: novo.id, detalhe: novo.url, executado_em: new Date().toISOString() }).eq("id", operacao.id);

  const categoria = `${nomeQuadro} › ${novo.lista}`;
  const { error: erroLigar } = await supabase
    .from("tarefas")
    .update({ fonte: "trello", id_externo: novo.id, categoria: categoria.slice(0, 100), status_sync: "sincronizado", trello_cartao_id: null })
    .eq("id", t.id);
  if (erroLigar) return { erro: `Cartão criado no Trello, mas a tarefa não foi ligada a ele: ${mensagemDoBanco(erroLigar)}` };
  await supabase.from("tarefa_membros").upsert({ tarefa_id: t.id, membro_id: membro.id });

  // c) a decisão. O banco exige o texto da decisão quando ela está tomada: se ainda não havia, vale o título do cartão.
  const resultado = resultadoDelegado(membro.nome, nomeQuadro, novo.lista);
  const { error } = await supabase
    .from("decisoes")
    .update(
      d.status === "pendente"
        ? { status: "tomada", decisao: textoDaDecisaoAoDelegar(d.decisao, dados.titulo), data_decisao: hojeSP(), responsavel_id: membro.pessoa_id, prazo: dados.prazo, tarefa_id: t.id, resultado }
        : { responsavel_id: membro.pessoa_id, prazo: dados.prazo, tarefa_id: t.id, resultado: acrescentarResultado(d.resultado, resultado) },
    )
    .eq("id", id);
  if (error) return { erro: `Cartão criado no Trello, mas a decisão não foi atualizada: ${mensagemDoBanco(error)}` };

  revalidatePath("/");
  redirect("/");
}

export async function adiarItem(id: string, fd: FormData) {
  if (!UUID.test(id)) return;
  const { supabase } = await exigirSessaoCompleta();
  const ate = texto(fd, "adiar_ate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ate)) redirect(`/?item=${id}&erro=adiar`);
  const { error } = await supabase.from("decisoes").update({ adiar_ate: ate }).eq("id", id);
  if (error) redirect(`/?item=${id}&erro=gravar`);
  revalidatePath("/");
  redirect("/");
}
