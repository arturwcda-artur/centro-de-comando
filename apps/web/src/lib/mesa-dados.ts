import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { carregarAlertas } from "@/lib/alertas-dados";
import { hojeSP } from "@/lib/formato";
import { pendenciasDasObrasPiloto } from "@/lib/prontidao-dados";
import { montarMesa, type Area, type Caixa, type FiltroMesa, type ItemMesa } from "@/lib/mesa";

type Cliente = SupabaseClient<Database>;
export type EmpresaMesa = { id: string; nome: string; tipo: "grupo" | "empresa" | "marca"; mae: string | null };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AREAS: Area[] = ["obras", "compras", "pessoas", "financeiro"];

/** Empresa escolhida + todas as que pertencem a ela (o grupo inclui todas). Nunca confiar no valor bruto da URL. */
export function lerFiltroMesa(p: Record<string, string | string[] | undefined>, empresas: EmpresaMesa[]): FiltroMesa {
  const e = typeof p.empresa === "string" && UUID.test(p.empresa) ? p.empresa : null;
  const escolhida = empresas.find((x) => x.id === e);
  const descendentes = (id: string): string[] => [id, ...empresas.filter((x) => x.mae === id).flatMap((x) => descendentes(x.id))];
  const obra = typeof p.obra === "string" && UUID.test(p.obra) ? p.obra : null;
  const area = typeof p.area === "string" && (AREAS as string[]).includes(p.area) ? (p.area as Area) : null;
  return { empresas: escolhida && escolhida.tipo !== "grupo" ? descendentes(escolhida.id) : null, obraId: obra, area };
}

export async function carregarMesa(supabase: Cliente, p: Record<string, string | string[] | undefined>) {
  const hoje = hojeSP();
  const [empresas, obras, decisoes, medicoes, aditivos, tarefas, vencimentos, riscos, alertas, prontidao] = await Promise.all([
    supabase.from("empresas").select("id, razao_social, nome_fantasia, tipo, empresa_mae_id").is("arquivado_em", null).order("razao_social"),
    supabase.from("obras").select("id, nome, empresa_id").is("arquivado_em", null).order("nome"),
    supabase.from("decisoes").select("id, tipo, problema, area, obra_id, empresa_id, recomendacao, prazo, adiar_ate, pessoas:responsavel_id(nome)").eq("status", "pendente"),
    supabase.from("medicoes").select("id, contrato_id, numero, situacao, periodo_fim, contratos(obra_id)").in("situacao", ["elaborada", "enviada"]),
    supabase.from("aditivos").select("id, contrato_id, numero, contratos(obra_id)").eq("situacao", "em_analise"),
    supabase.from("tarefas").select("id, titulo, obra_id, prazo, atualizado_em, pessoas:responsavel_id(nome, eh_usuario)").is("concluida_em", null).not("status", "in", "(concluida,cancelada)").not("responsavel_id", "is", null),
    supabase.from("v_vencimentos").select("registro_id, tipo, descricao, obra_id, data").gte("data", hoje),
    supabase.from("v_riscos_criticos").select("id, descricao, obra_id"),
    carregarAlertas(supabase),
    pendenciasDasObrasPiloto(supabase).catch(() => []),
  ]);
  const falhou = [empresas, obras, decisoes, medicoes, aditivos, tarefas, vencimentos, riscos].find((r) => r.error);

  const listaEmpresas: EmpresaMesa[] = (empresas.data ?? []).map((e) => ({ id: e.id, nome: e.nome_fantasia ?? e.razao_social, tipo: e.tipo as EmpresaMesa["tipo"], mae: e.empresa_mae_id }));
  const empresaDaObra = Object.fromEntries((obras.data ?? []).filter((o) => o.empresa_id).map((o) => [o.id, o.empresa_id as string]));
  const filtro = lerFiltroMesa(p, listaEmpresas);

  const caixas: Record<Caixa, ItemMesa[]> = montarMesa({
    hoje,
    empresaDaObra,
    decisoes: (decisoes.data ?? []).map((x) => ({ id: x.id, tipo: x.tipo as "decisao" | "aprovacao", problema: x.problema, area: x.area as Area | null, obra_id: x.obra_id, empresa_id: x.empresa_id, recomendacao: x.recomendacao, prazo: x.prazo, adiar_ate: x.adiar_ate, responsavel: (x.pessoas as { nome: string } | null)?.nome ?? null })),
    medicoesPendentes: (medicoes.data ?? []).map((m) => ({ id: m.id, contrato_id: m.contrato_id, numero: m.numero != null ? String(m.numero) : null, obra_id: (m.contratos as { obra_id: string | null } | null)?.obra_id ?? null, situacao: m.situacao, data_fim: m.periodo_fim })),
    aditivosPendentes: (aditivos.data ?? []).map((a) => ({ id: a.id, contrato_id: a.contrato_id, numero: a.numero != null ? String(a.numero) : null, obra_id: (a.contratos as { obra_id: string | null } | null)?.obra_id ?? null })),
    tarefasDelegadas: (tarefas.data ?? [])
      .filter((t) => !(t.pessoas as { eh_usuario: boolean } | null)?.eh_usuario)
      .map((t) => ({ id: t.id, titulo: t.titulo, obra_id: t.obra_id, prazo: t.prazo, responsavel: (t.pessoas as { nome: string } | null)?.nome ?? "—", atualizado_em: t.atualizado_em })),
    vencimentos: vencimentos.data ?? [],
    riscosCriticos: (riscos.data ?? []).map((r) => ({ id: r.id as string, titulo: (r.descricao as string) ?? "Risco", obra_id: r.obra_id as string | null })),
    alertas,
    prontidao,
  }, filtro);

  return {
    caixas,
    empresas: listaEmpresas,
    obras: (obras.data ?? []).map((o) => ({ id: o.id, nome: o.nome })),
    nomeObra: new Map((obras.data ?? []).map((o) => [o.id, o.nome])),
    nomeEmpresa: new Map(listaEmpresas.map((e) => [e.id, e.nome])),
    filtro,
    erro: falhou ? "Não foi possível carregar todos os dados agora. Atualize a página em instantes." : null,
  };
}
