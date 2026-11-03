import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { ESCORE_CRITICO, type VisaoTarefa } from "@/lib/dominio";
import { hojeSP, somarDias } from "@/lib/formato";

type Cliente = SupabaseClient<Database>;
export type TarefaPriorizada = Database["public"]["Views"]["v_tarefas_priorizadas"]["Row"];

const CAMPOS = "id, codigo, titulo, prazo, escore, vencida, vence_hoje, dias_para_prazo, tipo, status, critica, importancia, impacto, minha, fonte, obra_id, responsavel_id, aguardando_pessoa_id";

/** Tarefas de uma visão (RN-45), já ordenadas pela prioridade (RN-43). */
export async function tarefasDaVisao(supabase: Cliente, visao: VisaoTarefa, obraId: string | null) {
  if (visao === "concluidas") {
    let q = supabase.from("tarefas").select("id, codigo, titulo, prazo, concluida_em, tipo, status, fonte, obra_id, responsavel_id").eq("status", "concluida").order("concluida_em", { ascending: false }).limit(100);
    if (obraId) q = q.eq("obra_id", obraId);
    return { concluidas: (await q).data ?? [], abertas: [] as TarefaPriorizada[] };
  }
  let q = supabase.from("v_tarefas_priorizadas").select(CAMPOS).order("escore", { ascending: false }).order("prazo", { ascending: true, nullsFirst: false }).limit(300);
  if (obraId) q = q.eq("obra_id", obraId);
  if (visao === "minhas") q = q.eq("minha", true);
  if (visao === "aguardando") q = q.eq("status", "aguardando_terceiro");
  if (visao === "cobrancas") q = q.eq("tipo", "cobranca");
  if (visao === "criticas") q = q.or(`critica.eq.true,escore.gte.${ESCORE_CRITICO}`);
  if (visao === "vencimentos") q = q.lte("prazo", somarDias(hojeSP(), 15)).order("prazo");
  return { concluidas: [], abertas: ((await q).data ?? []) as TarefaPriorizada[] };
}

/** Contagem por visão, para as abas. */
export async function contarVisoes(supabase: Cliente) {
  const { data } = await supabase.from("v_tarefas_priorizadas").select("status, tipo, critica, escore, prazo, minha").limit(1000);
  const lista = data ?? [];
  const limite = somarDias(hojeSP(), 15);
  return {
    minhas: lista.filter((t) => t.minha).length,
    aguardando: lista.filter((t) => t.status === "aguardando_terceiro").length,
    cobrancas: lista.filter((t) => t.tipo === "cobranca").length,
    criticas: lista.filter((t) => t.critica || (t.escore ?? 0) >= ESCORE_CRITICO).length,
    vencimentos: lista.filter((t) => t.prazo && t.prazo <= limite).length,
    concluidas: null as number | null,
  };
}
