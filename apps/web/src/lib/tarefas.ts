import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { ESCORE_CRITICO, quadrosDoTrello, type VisaoTarefa } from "@/lib/dominio";
import { visivelNasListas } from "@/lib/equipe";
import { hojeSP, somarDias } from "@/lib/formato";

type Cliente = SupabaseClient<Database>;
export type TarefaPriorizada = Database["public"]["Views"]["v_tarefas_priorizadas"]["Row"];

const CAMPOS = "id, codigo, titulo, prazo, escore, vencida, vence_hoje, dias_para_prazo, tipo, status, categoria, critica, importancia, impacto, minha, fonte, obra_id, responsavel_id, aguardando_pessoa_id";

/** Ids das ordens do proprietário (RN-49t), que sempre aparecem nas listas. */
async function idsDeOrdens(supabase: Cliente) {
  const { data } = await supabase.from("tarefas").select("id").not("ordem_tipo", "is", null).limit(1000);
  return new Set((data ?? []).map((t) => t.id));
}

/** Tarefas de uma visão (RN-45), já ordenadas pela prioridade (RN-43). Sem `incluirEquipe`, aplica RN-49w. */
export async function tarefasDaVisao(supabase: Cliente, visao: VisaoTarefa, obraId: string | null, fonte: string | null = null, quadro: string | null = null, membro: string | null = null, incluirEquipe = false) {
  // Filtrar por quadro ou responsável é pedir para ver a equipe: aí tudo aparece
  const ordens = incluirEquipe || quadro || membro ? null : await idsDeOrdens(supabase);
  // Em lista de ids porque os membros ficam em outra tabela e a visão de prioridade não os conhece
  const doMembro = membro ? ((await supabase.from("tarefa_membros").select("tarefa_id").eq("membro_id", membro)).data ?? []).map((m) => m.tarefa_id) : null;
  if (visao === "concluidas") {
    let q = supabase.from("tarefas").select("id, codigo, titulo, prazo, concluida_em, tipo, status, categoria, fonte, obra_id, responsavel_id").eq("status", "concluida").order("concluida_em", { ascending: false }).limit(100);
    if (obraId) q = q.eq("obra_id", obraId);
    if (fonte) q = q.eq("fonte", fonte);
    if (quadro) q = q.like("categoria", `${quadro} › %`);
    if (doMembro) q = q.in("id", doMembro);
    const concluidas = (await q).data ?? [];
    return { concluidas: ordens ? concluidas.filter((t) => visivelNasListas({ ...t, minha: t.responsavel_id === null }, ordens)) : concluidas, abertas: [] as TarefaPriorizada[] };
  }
  let q = supabase.from("v_tarefas_priorizadas").select(CAMPOS).order("escore", { ascending: false }).order("prazo", { ascending: true, nullsFirst: false }).limit(300);
  if (obraId) q = q.eq("obra_id", obraId);
  if (fonte) q = q.eq("fonte", fonte);
  if (quadro) q = q.like("categoria", `${quadro} › %`);
  if (doMembro) q = q.in("id", doMembro);
  if (visao === "minhas") q = q.eq("minha", true);
  if (visao === "aguardando") q = q.eq("status", "aguardando_terceiro");
  if (visao === "cobrancas") q = q.eq("tipo", "cobranca");
  if (visao === "criticas") q = q.or(`critica.eq.true,escore.gte.${ESCORE_CRITICO}`);
  if (visao === "vencimentos") q = q.lte("prazo", somarDias(hojeSP(), 15)).order("prazo");
  const abertas = ((await q).data ?? []) as TarefaPriorizada[];
  return { concluidas: [], abertas: ordens ? abertas.filter((t) => visivelNasListas(t, ordens)) : abertas };
}

/** Membros do Trello e os responsáveis de cada cartão, para mostrar quem está executando. */
export async function carregarResponsaveis(supabase: Cliente) {
  const [membros, vinculos] = await Promise.all([
    supabase.from("trello_membros").select("id, nome, pessoas(telefone)").order("nome"),
    supabase.from("tarefa_membros").select("tarefa_id, membro_id, trello_membros(nome)").limit(1000),
  ]);
  const porTarefa = new Map<string, string[]>();
  const idsPorTarefa = new Map<string, string[]>();
  for (const v of vinculos.data ?? []) {
    porTarefa.set(v.tarefa_id, [...(porTarefa.get(v.tarefa_id) ?? []), v.trello_membros.nome]);
    idsPorTarefa.set(v.tarefa_id, [...(idsPorTarefa.get(v.tarefa_id) ?? []), v.membro_id]);
  }
  const lista = (membros.data ?? []).map((m) => ({ id: m.id, nome: m.nome, telefone: m.pessoas?.telefone ?? null }));
  return { membros: lista, porTarefa, idsPorTarefa };
}

/** Contagem por visão, para as abas. */
export async function contarVisoes(supabase: Cliente, incluirEquipe = false) {
  const [{ data }, ordens] = await Promise.all([supabase.from("v_tarefas_priorizadas").select("id, status, tipo, critica, escore, prazo, minha, fonte, categoria").limit(1000), idsDeOrdens(supabase)]);
  const todas = data ?? [];
  const lista = incluirEquipe ? todas : todas.filter((t) => visivelNasListas(t, ordens));
  const limite = somarDias(hojeSP(), 15);
  return {
    minhas: lista.filter((t) => t.minha).length,
    todas: lista.length,
    aguardando: lista.filter((t) => t.status === "aguardando_terceiro").length,
    cobrancas: lista.filter((t) => t.tipo === "cobranca").length,
    criticas: lista.filter((t) => t.critica || (t.escore ?? 0) >= ESCORE_CRITICO).length,
    vencimentos: lista.filter((t) => t.prazo && t.prazo <= limite).length,
    concluidas: null as number | null,
    quadros: quadrosDoTrello(todas),
    daEquipeOcultas: todas.length - todas.filter((t) => visivelNasListas(t, ordens)).length,
  };
}
