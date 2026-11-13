"use server";
import { alterarEvento, criarEvento, excluirEvento } from "@cc/integrations/src/google.js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { acessoGoogle } from "@/lib/google";
import { textoDoLembrete, type Detalhe5w2h } from "@/lib/gut";
import { UUID } from "@/lib/obras";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { compromissoSchema, mensagemDoBanco, validar, type EstadoFormulario } from "@/lib/validacao";

type Sessao = Awaited<ReturnType<typeof exigirSessaoCompleta>>["supabase"];

function revalidarTudo() {
  revalidatePath("/agenda", "layout");
  revalidatePath("/meu-dia");
  revalidatePath("/");
}

async function escritaAutorizada(supabase: Sessao) {
  const { data } = await supabase.from("conectores").select("modo, escrita_autorizada_em").eq("ferramenta", "google_agenda").maybeSingle();
  return data?.modo === "leitura_escrita" && !!data.escrita_autorizada_em;
}

/**
 * Grava primeiro no Google e registra em operacoes_externas (ADR 0013). Se o Google recusar, o
 * sistema não muda e o erro aparece na tela. Devolve null quando a gravação falhou.
 */
async function noGoogle<T>(
  supabase: Sessao,
  operacao: { operacao: "criar" | "alterar" | "excluir"; registro_id: string; id_externo: string },
  gravar: (acesso: string) => Promise<T>,
): Promise<{ resultado: T; registrar: (idExterno?: string) => Promise<void> } | { erro: string }> {
  const { data: op, error } = await supabase
    .from("operacoes_externas")
    .insert({ ...operacao, ferramenta: "google_agenda", entidade: "eventos" })
    .select("id")
    .single();
  if (error) return { erro: mensagemDoBanco(error) };

  try {
    const resultado = await gravar(await acessoGoogle(supabase));
    return {
      resultado,
      registrar: async (idExterno) => {
        await supabase
          .from("operacoes_externas")
          .update({ status: "sucesso", executado_em: new Date().toISOString(), ...(idExterno ? { id_externo: idExterno } : {}) })
          .eq("id", op.id);
      },
    };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Falha no Google Agenda";
    await supabase.from("operacoes_externas").update({ status: "erro", erro: erro.slice(0, 500), executado_em: new Date().toISOString() }).eq("id", op.id);
    return { erro: `Não salvo: ${erro}` };
  }
}

/** Lembrete de uma ação 5W2H: evento de dia inteiro com o 5W2H na descrição (RN-49g, RN-49h). */
export async function criarLembreteDeAcao(tarefaId: string, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  const data = String(fd.get("data") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) return { erros: { data: "Data inválida." } };
  if (!UUID.test(tarefaId)) return { erro: "Ação inválida." };
  if (!(await escritaAutorizada(supabase))) return { erro: "Conecte o Google em Integrações para gravar na agenda." };

  const { data: t } = await supabase.from("tarefas").select("id, titulo, prazo, obra_id, problema_id, obras(codigo), problemas(gut), acoes_detalhes(*)").eq("id", tarefaId).maybeSingle();
  if (!t) return { erro: "Ação não encontrada." };
  const h = await headers();
  const link = t.problema_id ? `https://${h.get("host")}/problemas/${t.problema_id}` : `https://${h.get("host")}/tarefas/${t.id}`;
  // O GUT é do problema; a ação traz o 5W2H
  const detalhe = { ...(t.acoes_detalhes as Detalhe5w2h | null), gut: t.problemas?.gut ?? (t.acoes_detalhes as Detalhe5w2h | null)?.gut ?? null } as Detalhe5w2h;
  const { titulo, descricao } = textoDoLembrete({ titulo: t.titulo, prazo: t.prazo, obra: t.obras?.codigo ?? null, detalhe }, link);

  const novoId = crypto.randomUUID();
  const r = await noGoogle(supabase, { operacao: "criar", registro_id: novoId, id_externo: "novo" }, (acesso) =>
    criarEvento(acesso, { titulo, data, dataFim: data, diaInteiro: true, local: "", descricao }),
  );
  if ("erro" in r) return { erro: r.erro };
  await r.registrar(r.resultado.id_externo);
  const { error } = await supabase.from("eventos").insert({
    ...r.resultado,
    id: novoId,
    obra_id: t.obra_id,
    fonte: "google_agenda",
    status_sync: "sincronizado",
    importado_em: new Date().toISOString(),
  });
  revalidarTudo();
  if (error) return { ok: true, mensagem: "Lembrete criado no Google Agenda. Ele aparece aqui na próxima sincronização." };
  return { ok: true, mensagem: "Lembrete criado no Google Agenda." };
}

/** Cria (id nulo) ou altera um compromisso. Em evento recorrente, altera só esta ocorrência. */
export async function salvarCompromisso(id: string | null, _: EstadoFormulario, fd: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  const { dados, erros } = validar(compromissoSchema, fd);
  if (!dados) return { erros };
  if (!(await escritaAutorizada(supabase))) return { erro: "Conecte o Google em Integrações para gravar na agenda." };

  const evento = {
    titulo: dados.titulo,
    data: dados.data,
    dataFim: dados.data_fim,
    inicio: dados.inicio ?? undefined,
    fim: dados.fim ?? undefined,
    diaInteiro: dados.dia_inteiro,
  };

  if (!id) {
    const novoId = crypto.randomUUID();
    const r = await noGoogle(supabase, { operacao: "criar", registro_id: novoId, id_externo: "novo" }, (acesso) =>
      criarEvento(acesso, { ...evento, local: dados.local ?? "", descricao: dados.descricao ?? "" }),
    );
    if ("erro" in r) return { erro: r.erro };
    await r.registrar(r.resultado.id_externo);
    const { error } = await supabase.from("eventos").insert({
      ...r.resultado,
      id: novoId,
      obra_id: dados.obra_id,
      fonte: "google_agenda",
      status_sync: "sincronizado",
      importado_em: new Date().toISOString(),
    });
    if (error) return { erro: `Criado no Google, mas aparece aqui só após a próxima sincronização: ${mensagemDoBanco(error)}` };
  } else {
    if (!UUID.test(id)) return { erro: "Compromisso inválido." };
    const { data: atual } = await supabase.from("eventos").select("id_externo, calendario_externo_id, descricao, local").eq("id", id).maybeSingle();
    if (!atual?.id_externo || atual.calendario_externo_id !== "primary") return { erro: "Compromisso não encontrado na agenda conectada." };
    const idExterno = atual.id_externo;

    // O espelho guarda texto cortado: campo não mexido não é reenviado, para não perder nada no Google
    const r = await noGoogle(supabase, { operacao: "alterar", registro_id: id, id_externo: idExterno }, (acesso) =>
      alterarEvento(acesso, idExterno, {
        ...evento,
        local: dados.local === atual.local ? undefined : (dados.local ?? ""),
        descricao: dados.descricao === atual.descricao ? undefined : (dados.descricao ?? ""),
      }),
    );
    if ("erro" in r) return { erro: r.erro };
    await r.registrar();
    // hash nulo: a próxima sincronização relê o evento e confirma o estado vindo do Google
    const { error } = await supabase.from("eventos").update({ ...r.resultado, obra_id: dados.obra_id, hash_conteudo: null }).eq("id", id);
    if (error) return { erro: `Salvo no Google, mas atualiza aqui só após a próxima sincronização: ${mensagemDoBanco(error)}` };
  }
  revalidarTudo();
  redirect("/agenda");
}

/** Exclui só esta ocorrência no Google. Aqui o registro fica guardado como cancelado (cancelado_em). */
export async function excluirCompromisso(id: string, _: EstadoFormulario): Promise<EstadoFormulario> {
  const { supabase } = await exigirSessaoCompleta();
  if (!UUID.test(id)) return { erro: "Compromisso inválido." };
  if (!(await escritaAutorizada(supabase))) return { erro: "Conecte o Google em Integrações para gravar na agenda." };

  const { data: atual } = await supabase.from("eventos").select("id_externo, calendario_externo_id").eq("id", id).maybeSingle();
  if (!atual?.id_externo || atual.calendario_externo_id !== "primary") return { erro: "Compromisso não encontrado na agenda conectada." };
  const idExterno = atual.id_externo;

  const r = await noGoogle(supabase, { operacao: "excluir", registro_id: id, id_externo: idExterno }, (acesso) => excluirEvento(acesso, idExterno));
  if ("erro" in r) return { erro: r.erro };
  await r.registrar();
  await supabase.from("eventos").update({ cancelado_em: new Date().toISOString(), hash_conteudo: null }).eq("id", id);
  revalidarTudo();
  redirect("/agenda");
}
