import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Cliente = SupabaseClient<Database>;

/** Opções para os seletores dos formulários (cadastros ativos). */
export async function carregarOpcoes(supabase: Cliente) {
  const [empresas, contratantes, pessoas] = await Promise.all([
    supabase.from("empresas").select("id, razao_social, nome_fantasia").is("arquivado_em", null).order("razao_social"),
    supabase.from("contratantes").select("id, nome").is("arquivado_em", null).order("nome"),
    supabase.from("pessoas").select("id, nome, funcao").is("arquivado_em", null).order("nome"),
  ]);
  return {
    empresas: (empresas.data ?? []).map((e) => ({ valor: e.id, rotulo: e.nome_fantasia || e.razao_social })),
    contratantes: (contratantes.data ?? []).map((c) => ({ valor: c.id, rotulo: c.nome })),
    pessoas: (pessoas.data ?? []).map((p) => ({ valor: p.id, rotulo: p.funcao ? `${p.nome} (${p.funcao})` : p.nome })),
  };
}

export type Opcoes = Awaited<ReturnType<typeof carregarOpcoes>>;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
