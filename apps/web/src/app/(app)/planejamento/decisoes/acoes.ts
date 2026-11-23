"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calcular, carregarAvaliacao, mudancaDe } from "@/lib/cerebro-dados";
import { espelharNoTrello } from "@/lib/espelho-trello";
import { dataCivil, hojeSP } from "@/lib/formato";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { mensagemDoBanco, type EstadoFormulario } from "@/lib/validacao";

type Cliente = Awaited<ReturnType<typeof exigirSessaoCompleta>>["supabase"];

function revalidar(decisaoId: string) {
  revalidatePath("/planejamento", "layout");
  revalidatePath("/tarefas", "layout");
  revalidatePath("/");
  redirect(`/planejamento/decisoes/${decisaoId}`);
}

/**
 * A tarefa "Atualizar o planejamento" da decisão (RN-49m) recebe o resultado: com a rota quando
 * aprovada; concluída quando a decisão não altera o planejamento. O cartão no Trello acompanha.
 */
async function atualizarTarefa(
  supabase: Cliente,
  d: { id: string; obra_id: string | null; tarefa_planejamento_id: string | null; decisao: string | null },
  campos: { titulo: string; descricao: string; concluir: boolean },
  comentario: string,
) {
  const registro = {
    titulo: campos.titulo.slice(0, 300),
    descricao: campos.descricao.slice(0, 4000),
    ...(campos.concluir ? { status: "concluida", concluida_em: new Date().toISOString() } : {}),
  };
  let id = d.tarefa_planejamento_id;
  if (id) {
    const { error } = await supabase.from("tarefas").update(registro).eq("id", id).eq("fonte", "manual");
    if (error) return mensagemDoBanco(error);
  } else if (!campos.concluir) {
    const { data, error } = await supabase
      .from("tarefas")
      .insert({ ...registro, obra_id: d.obra_id, tipo: "acao", categoria: "Planejamento", importancia: 4, impacto: 4, critica: true })
      .select("id")
      .single();
    if (error) return mensagemDoBanco(error);
    id = data.id;
    await supabase.from("decisoes").update({ tarefa_planejamento_id: id }).eq("id", d.id);
  }
  if (id) await espelharNoTrello(supabase, [id], comentario);
  return null;
}

/** Aprova a alteração: guarda o efeito calculado e leva a rota para a tarefa de atualizar o cronograma (RN-49n). */
export async function aprovarAvaliacao(decisaoId: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(decisaoId)) return { erro: "Decisão inválida." };
  const dados = await carregarAvaliacao(supabase, decisaoId);
  if (!dados) return { erro: "Decisão não encontrada." };
  // O efeito é recalculado aqui, com o cronograma do banco: o que vem da tela é só a escolha
  const mudanca = mudancaDe({ atividade: fd.get("atividade"), tipo: fd.get("tipo"), dias: fd.get("dias") });
  const r = calcular(dados, mudanca);
  if (!mudanca || !r || !dados.versao) return { erro: "Escolha a atividade e a mudança e calcule antes de aprovar." };

  const { error } = await supabase.from("avaliacoes_planejamento").upsert(
    {
      decisao_id: decisaoId,
      obra_id: dados.decisao.obra_id,
      versao_id: dados.versao.id,
      atividade_id: mudanca.atividadeId,
      atividade_nome: r.alvo.rotulo.slice(0, 300),
      tipo_mudanca: mudanca.tipo,
      dias: mudanca.dias,
      situacao: "aprovada",
      termino_antes: r.terminoAntes,
      termino_depois: r.terminoDepois,
      variacao_uteis: r.variacaoUteis,
      conflitos: r.conflitos,
      rota: r.rota.map((p, i) => `${i + 1}. ${p}`).join("\n"),
      decidido_em: new Date().toISOString(),
    },
    { onConflict: "decisao_id" },
  );
  if (error) return { erro: mensagemDoBanco(error) };

  const rota = r.rota.map((p, i) => `${i + 1}. ${p}`).join("\n");
  const variacao = r.variacaoUteis === 0 ? "término mantido" : `término ${r.variacaoUteis > 0 ? "+" : ""}${r.variacaoUteis} dias úteis`;
  const falha = await atualizarTarefa(
    supabase,
    dados.decisao,
    {
      titulo: `Atualizar o cronograma: ${r.alvo.rotulo} (${variacao})`,
      descricao: `Decisão de ${dataCivil(dados.decisao.data_decisao)}: ${dados.decisao.decisao ?? ""}\n\nAlteração aprovada em ${dataCivil(hojeSP())}. Rota:\n${rota}`,
      concluir: false,
    },
    `Alteração do planejamento aprovada. Rota:\n${rota}`,
  );
  if (falha) return { erro: `Avaliação aprovada, mas a tarefa de atualizar o cronograma não foi ajustada: ${falha}` };
  revalidar(decisaoId);
  return { ok: true };
}

/** A decisão não altera o planejamento: fica registrado e a tarefa de atualizar é concluída. */
export async function naoAlterar(decisaoId: string): Promise<void> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(decisaoId)) return;
  const dados = await carregarAvaliacao(supabase, decisaoId);
  if (!dados) return;
  await supabase.from("avaliacoes_planejamento").upsert(
    {
      decisao_id: decisaoId,
      obra_id: dados.decisao.obra_id,
      versao_id: dados.versao?.id ?? null,
      atividade_id: null,
      atividade_nome: null,
      tipo_mudanca: null,
      dias: null,
      situacao: "nao_alterar",
      termino_antes: null,
      termino_depois: null,
      variacao_uteis: null,
      conflitos: [],
      rota: null,
      decidido_em: new Date().toISOString(),
    },
    { onConflict: "decisao_id" },
  );
  await atualizarTarefa(
    supabase,
    dados.decisao,
    {
      titulo: `Planejamento avaliado: ${dados.decisao.decisao ?? dados.decisao.problema}`,
      descricao: `Decisão de ${dataCivil(dados.decisao.data_decisao)}: ${dados.decisao.decisao ?? ""}\n\nAvaliada em ${dataCivil(hojeSP())}: não altera o planejamento.`,
      concluir: true,
    },
    "Avaliado: a decisão não altera o planejamento.",
  );
  revalidar(decisaoId);
}
