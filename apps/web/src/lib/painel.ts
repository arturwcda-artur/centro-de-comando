import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { calcularIndicadores } from "@/lib/indicadores";
import { hojeSP, limitesDoDiaSP, somarDias } from "@/lib/formato";

type Cliente = SupabaseClient<Database>;

export const PERIODOS = [7, 15, 30] as const;
export type Filtros = { obraId: string | null; dias: (typeof PERIODOS)[number] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Valida os filtros vindos da URL (nunca confiar no valor bruto). */
export function lerFiltros(params: Record<string, string | string[] | undefined>): Filtros {
  const obra = typeof params.obra === "string" && UUID.test(params.obra) ? params.obra : null;
  const dias = Number(params.dias);
  return { obraId: obra, dias: (PERIODOS as readonly number[]).includes(dias) ? (dias as Filtros["dias"]) : 15 };
}

/** Todos os dados do painel executivo, lidos das views (mesma fonte dos relatórios e da IA — ADR 0009). */
export async function carregarPainel(supabase: Cliente, filtros: Filtros) {
  const hoje = hojeSP();
  const ate = somarDias(hoje, filtros.dias);
  const { inicio: inicioHoje, fim: fimHoje } = limitesDoDiaSP(hoje);
  const fimSemana = limitesDoDiaSP(somarDias(hoje, 6)).fim;
  const porObra = <Q extends { eq: (c: "obra_id", v: string) => Q }>(q: Q) => (filtros.obraId ? q.eq("obra_id", filtros.obraId) : q);

  let consultaObras = supabase.from("v_obra_resumo").select("*").order("nome");
  if (filtros.obraId) consultaObras = consultaObras.eq("obra_id", filtros.obraId);

  const [obras, listaObras, tarefas, vencimentos, problemasCriticos, problemas, eventosHoje, eventosSemana] = await Promise.all([
    consultaObras,
    supabase.from("obras").select("id, codigo, nome").is("arquivado_em", null).order("nome"),
    porObra(
      supabase
        .from("v_tarefas_priorizadas")
        .select("id, titulo, prazo, escore, vencida, vence_hoje, tipo, status, obra_id")
        .order("escore", { ascending: false })
        .order("prazo", { ascending: true, nullsFirst: false })
        .limit(500),
    ),
    porObra(
      supabase.from("v_vencimentos").select("tipo, registro_id, obra_id, descricao, data").gte("data", hoje).lte("data", ate).order("data").limit(8),
    ),
    porObra(supabase.from("problemas").select("id", { count: "exact", head: true }).in("status", ["aberto", "em_andamento"]).gte("gut", 64)),
    porObra(supabase.from("problemas").select("id, titulo, gut, obra_id").in("status", ["aberto", "em_andamento"]).order("gut", { ascending: false }).limit(5)),
    porObra(supabase.from("eventos").select("id, titulo, inicio, fim, dia_inteiro, local").is("cancelado_em", null).gte("inicio", inicioHoje).lte("inicio", fimHoje).order("inicio")),
    porObra(supabase.from("eventos").select("id", { count: "exact", head: true }).is("cancelado_em", null).gte("inicio", inicioHoje).lte("inicio", fimSemana)),
  ]);

  const erro = [obras, listaObras, tarefas, vencimentos, problemasCriticos, problemas, eventosHoje, eventosSemana].find((r) => r.error)?.error;
  const abertas = tarefas.data ?? [];
  const nomeObra = new Map((listaObras.data ?? []).map((o) => [o.id, o.nome]));

  return {
    hoje,
    erro: erro ? "Não foi possível carregar todos os dados agora. Atualize a página em instantes." : null,
    obrasParaFiltro: listaObras.data ?? [],
    nomeObra,
    indicadores: calcularIndicadores(obras.data ?? [], hoje),
    obrasComAtraso: (obras.data ?? []).filter((o) => Number(o.dias_alem_do_prazo ?? 0) > 0).slice(0, 5),
    tarefasVencidas: abertas.filter((t) => t.vencida).length,
    tarefasHoje: abertas.filter((t) => t.vence_hoje).length,
    prioridades: abertas.slice(0, 6),
    vencimentos: vencimentos.data ?? [],
    problemasCriticos: problemasCriticos.count ?? 0,
    problemasGraves: problemas.data ?? [],
    eventosHoje: eventosHoje.data ?? [],
    eventosSemana: eventosSemana.count ?? 0,
  };
}
