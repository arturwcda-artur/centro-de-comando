/** Regras da Mesa do Gestor (spec 2026-11-26). Sem banco, para poder testar. */
import type { Alerta } from "@/lib/alertas";
import { somarDias } from "@/lib/formato";

export type Area = "obras" | "compras" | "pessoas" | "financeiro";
export type Caixa = "decidir" | "aprovar" | "cobrar" | "alertas";
export type ItemMesa = { chave: string; caixa: Caixa; titulo: string; obraId: string | null; empresaId: string | null; area: Area; responsavel: string | null; prazo: string | null; gravidade: number; recomendacao: string | null; href: string; decisaoId: string | null };
export type DadosMesa = {
  hoje: string;
  empresaDaObra: Record<string, string>;
  decisoes: { id: string; tipo: "decisao" | "aprovacao"; problema: string; area: Area | null; obra_id: string | null; empresa_id: string | null; recomendacao: string | null; prazo: string | null; adiar_ate: string | null; responsavel: string | null }[];
  medicoesPendentes: { id: string; contrato_id: string; numero: string | null; obra_id: string | null; situacao: string; data_fim: string | null }[];
  aditivosPendentes: { id: string; contrato_id: string; numero: string | null; obra_id: string | null }[];
  tarefasDelegadas: { id: string; titulo: string; obra_id: string | null; prazo: string | null; responsavel: string; atualizado_em: string }[];
  vencimentos: { registro_id: string | null; tipo: string | null; descricao: string | null; obra_id: string | null; data: string | null }[];
  riscosCriticos: { id: string; titulo: string; obra_id: string | null }[];
  alertas: Alerta[];
};
export type FiltroMesa = { empresas: string[] | null; obraId: string | null; area: Area | null };

export const DIAS_SEM_MOVIMENTO = 7;
export const DIAS_VENCIMENTO_MESA = 15;

const AREA_DO_ALERTA: Record<Alerta["grupo"], Area> = { Contratos: "financeiro", Prazos: "obras", Equipe: "pessoas", Problemas: "obras", "Integrações": "obras" };

export function montarMesa(d: DadosMesa, f: FiltroMesa): Record<Caixa, ItemMesa[]> {
  const emp = (obraId: string | null, empresaId: string | null = null) => empresaId ?? (obraId ? d.empresaDaObra[obraId] ?? null : null);
  const itens: ItemMesa[] = [];
  const add = (i: Omit<ItemMesa, "empresaId"> & { empresaId?: string | null }) => itens.push({ ...i, empresaId: i.empresaId ?? emp(i.obraId) });

  for (const x of d.decisoes) {
    if (x.adiar_ate && x.adiar_ate > d.hoje) continue;
    add({ chave: `decisao:${x.id}`, caixa: x.tipo === "aprovacao" ? "aprovar" : "decidir", titulo: x.problema, obraId: x.obra_id, empresaId: emp(x.obra_id, x.empresa_id), area: x.area ?? "obras", responsavel: x.responsavel, prazo: x.prazo, gravidade: 2, recomendacao: x.recomendacao, href: `/?item=${x.id}`, decisaoId: x.id });
  }
  for (const m of d.medicoesPendentes) add({ chave: `medicao:${m.id}`, caixa: "aprovar", titulo: `Aprovar medição ${m.numero ?? ""}`.trim(), obraId: m.obra_id, area: "financeiro", responsavel: null, prazo: m.data_fim, gravidade: 2, recomendacao: null, href: `/contratos/${m.contrato_id}`, decisaoId: null });
  for (const a of d.aditivosPendentes) add({ chave: `aditivo:${a.id}`, caixa: "aprovar", titulo: `Analisar aditivo ${a.numero ?? ""}`.trim(), obraId: a.obra_id, area: "financeiro", responsavel: null, prazo: null, gravidade: 2, recomendacao: null, href: `/contratos/${a.contrato_id}`, decisaoId: null });

  const limiteParado = somarDias(d.hoje, -DIAS_SEM_MOVIMENTO);
  for (const t of d.tarefasDelegadas) {
    const vencida = !!t.prazo && t.prazo < d.hoje;
    const parada = t.atualizado_em.slice(0, 10) < limiteParado;
    if (!vencida && !parada) continue;
    add({ chave: `tarefa:${t.id}`, caixa: "cobrar", titulo: vencida ? `${t.titulo} (vencida)` : `${t.titulo} (sem movimento)`, obraId: t.obra_id, area: "obras", responsavel: t.responsavel, prazo: t.prazo, gravidade: vencida ? 3 : 1, recomendacao: null, href: `/tarefas/${t.id}`, decisaoId: null });
  }

  const limiteVenc = somarDias(d.hoje, DIAS_VENCIMENTO_MESA);
  for (const v of d.vencimentos) {
    // tarefas ficam em COBRAR e decisões em DECIDIR: aqui só marcos e recebimentos
    if (v.tipo !== "marco" && v.tipo !== "recebimento_previsto") continue;
    if (!v.data || v.data < d.hoje || v.data > limiteVenc) continue;
    add({ chave: `venc:${v.tipo}:${v.registro_id}`, caixa: "alertas", titulo: v.descricao ?? "Vencimento", obraId: v.obra_id, area: v.tipo === "recebimento_previsto" ? "financeiro" : "obras", responsavel: null, prazo: v.data, gravidade: 2, recomendacao: null, href: v.obra_id ? `/obras/${v.obra_id}` : "/alertas", decisaoId: null });
  }
  for (const r of d.riscosCriticos) add({ chave: `risco:${r.id}`, caixa: "alertas", titulo: `Risco crítico: ${r.titulo}`, obraId: r.obra_id, area: "obras", responsavel: null, prazo: null, gravidade: 3, recomendacao: null, href: r.obra_id ? `/obras/${r.obra_id}` : "/alertas", decisaoId: null });
  // Alertas RN-83 sem repetir o que já está nas outras caixas; marcos vencidos viram uma linha só
  let marcosVencidos = 0;
  for (const a of d.alertas) {
    if (/^(Marco|Decisão|Recebimento): .* Vence em /.test(a.texto)) continue;
    if (/^Marco: .* Venceu em /.test(a.texto)) { marcosVencidos++; continue; }
    if (/^Decisão: .* Venceu em /.test(a.texto)) continue;
    if (/tarefas? vencidas?.$|cart(ão|ões) parados? há/.test(a.texto)) continue;
    add({ chave: `alerta:${a.texto}`, caixa: "alertas", titulo: a.texto, obraId: null, area: AREA_DO_ALERTA[a.grupo], responsavel: null, prazo: null, gravidade: a.grave ? 3 : 1, recomendacao: null, href: a.href, decisaoId: null });
  }
  if (marcosVencidos > 0) add({ chave: "alerta:marcos-vencidos", caixa: "alertas", titulo: `${marcosVencidos} ${marcosVencidos === 1 ? "marco vencido" : "marcos vencidos"} no cronograma — revisar a programação`, obraId: null, area: "obras", responsavel: null, prazo: null, gravidade: 3, recomendacao: null, href: "/planejamento", decisaoId: null });

  const passa = (i: ItemMesa) =>
    (!f.empresas || (i.empresaId !== null && f.empresas.includes(i.empresaId))) &&
    (!f.obraId || i.obraId === f.obraId) &&
    (!f.area || i.area === f.area);
  const ordem = (a: ItemMesa, b: ItemMesa) => (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999") || b.gravidade - a.gravidade;

  const caixas: Record<Caixa, ItemMesa[]> = { decidir: [], aprovar: [], cobrar: [], alertas: [] };
  for (const i of itens.filter(passa)) caixas[i.caixa].push(i);
  for (const c of Object.keys(caixas) as Caixa[]) caixas[c].sort(ordem);
  return caixas;
}
