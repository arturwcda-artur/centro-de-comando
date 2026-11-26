# Mesa do Gestor — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a tela inicial do Centro de Comando pela Mesa do Gestor (4 caixas por exceção para o gestor operacional do Grupo C.Salles) e mostrar as pastas extras das obras pelo nome.

**Architecture:** Uma migração (0039) acrescenta hierarquia em `empresas`, campos de mesa em `decisoes`, a categoria `pasta_da_obra` em `documentos` e a RPC `lancar_item_mesa`. Regras puras em `lib/mesa.ts` (testadas com vitest) montam as caixas a partir de dados carregados por `lib/mesa-dados.ts`. A página `/` passa a ser a Mesa; o painel atual vai para `/painel`. Ações (decidir/delegar/adiar) são server actions. O agente local (Python) ganha a regra 16+.

**Tech Stack:** Next.js (app router, server components/actions), Supabase (Postgres + RLS `app.is_proprietario()`), vitest, Python 3 + pytest (agente local).

**Spec:** `docs/superpowers/specs/2026-11-26-mesa-do-gestor-design.md`

## Global Constraints
- 100% plano gratuito (Supabase free + Vercel free); nenhum serviço novo.
- Toda tabela segue RLS por `app.is_proprietario()` (colunas novas herdam as políticas existentes).
- Textos da interface em português do Brasil, sem jargão.
- Nada é removido: o painel executivo atual continua acessível em `/painel`.
- Trabalhar no ramo `feat/mesa-do-gestor`; não fazer push sem ok do Arthur.
- Depois de mudar o esquema: `npx.cmd supabase gen types typescript --project-id <ref> --schema public > apps/web/src/lib/database.types.ts` (ref em `supabase/.temp/project-ref`).

---

### Task 1: Migração 0039 (grupo, campos da mesa, categoria, RPC)

**Files:**
- Create: `supabase/migrations/0039_mesa_do_gestor.sql`
- Modify: `apps/web/src/lib/database.types.ts` (regenerado)

**Interfaces:**
- Produces: `empresas.tipo` ('grupo'|'empresa'|'marca'), `empresas.empresa_mae_id`; `decisoes.tipo` ('decisao'|'aprovacao'), `decisoes.area` ('obras'|'compras'|'pessoas'|'financeiro'|null), `decisoes.empresa_id`, `decisoes.recomendacao`, `decisoes.principio`, `decisoes.impacto`, `decisoes.adiar_ate`; `documentos.categoria` aceita 'pasta_da_obra'; RPC `public.lancar_item_mesa(p_tipo text, p_problema text, p_area text, p_obra_id uuid, p_empresa_id uuid, p_recomendacao text, p_principio text, p_impacto text, p_prazo date) returns uuid`.

- [ ] **Step 1: Criar o ramo**

Run: `git -C C:/dev/centro-de-comando checkout -b feat/mesa-do-gestor`

- [ ] **Step 2: Escrever a migração**

```sql
-- 0039 — Mesa do Gestor (spec 2026-11-26-mesa-do-gestor-design.md)
-- Decisão do proprietário em 26/11/2026: a tela inicial mostra só o que exige a direção dele no Grupo C.Salles.

alter table public.empresas
  add column tipo text not null default 'empresa' check (tipo in ('grupo','empresa','marca')),
  add column empresa_mae_id uuid references public.empresas(id) on delete set null;
comment on column public.empresas.tipo is 'grupo (holding), empresa operacional ou marca.';
comment on column public.empresas.empresa_mae_id is 'Empresa/grupo a que esta pertence.';

alter table public.decisoes
  add column tipo text not null default 'decisao' check (tipo in ('decisao','aprovacao')),
  add column area text check (area in ('obras','compras','pessoas','financeiro')),
  add column empresa_id uuid references public.empresas(id) on delete set null,
  add column recomendacao text,
  add column principio text,
  add column impacto text,
  add column adiar_ate date;
create index decisoes_mesa_idx on public.decisoes (status, tipo) where status = 'pendente';

alter table public.documentos drop constraint if exists documentos_categoria_check;
alter table public.documentos add constraint documentos_categoria_check check (categoria in (
  'planejamento','orcamento_licitacao','contratos','aditivos_reequilibrios','medicoes',
  'financeiro','compras_materiais','projetos_tecnicos','programacoes','atas_reunioes',
  'oficios_requerimentos','juridicos','equipe_efetivo','diario_obra','terceirizados',
  'revisar','pasta_da_obra','outro'));

create or replace function public.lancar_item_mesa(
  p_tipo text, p_problema text, p_area text, p_obra_id uuid, p_empresa_id uuid,
  p_recomendacao text, p_principio text, p_impacto text, p_prazo date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not app.is_proprietario() and current_user not in ('postgres','service_role') then
    raise exception 'sem permissão';
  end if;
  insert into public.decisoes (tipo, problema, area, obra_id, empresa_id, recomendacao, principio, impacto, prazo, fonte)
  values (p_tipo, p_problema, p_area, p_obra_id, p_empresa_id, p_recomendacao, p_principio, p_impacto, p_prazo, 'assistente')
  returning id into v_id;
  return v_id;
end $$;
comment on function public.lancar_item_mesa is 'Assistente lança um item DECIDIR/APROVAR na Mesa do Gestor.';

-- Carga do grupo (idempotente por razão social)
insert into public.empresas (razao_social, nome_fantasia, tipo)
select 'Grupo C.Salles', 'Grupo C.Salles', 'grupo'
where not exists (select 1 from public.empresas where razao_social = 'Grupo C.Salles');
insert into public.empresas (razao_social, nome_fantasia, tipo, empresa_mae_id)
select n, n, t, (select id from public.empresas where razao_social = 'Grupo C.Salles')
from (values ('L7 Construtora','empresa'),('CDN Engenharia','empresa'),('C.Salles Engenharia','empresa'),
             ('Menrah Capital','marca'),('Paladino','marca'),('PIB School','marca')) v(n,t)
where not exists (select 1 from public.empresas e where e.razao_social = v.n or e.nome_fantasia = v.n);
```

- [ ] **Step 3: Aplicar e conferir**

Run: `npx.cmd supabase db push` (em `C:/dev/centro-de-comando`)
Run: `npx.cmd supabase db query --remote --yes "select razao_social, tipo from public.empresas order by tipo"`
Expected: Grupo C.Salles (grupo), 3 empresas, 3 marcas (empresas que já existiam com o mesmo nome não são duplicadas).

- [ ] **Step 4: Regenerar tipos e checar compilação**

Run: `npx.cmd supabase gen types typescript --project-id <ref> --schema public > apps/web/src/lib/database.types.ts`
Run: `npm run typecheck -w @cc/web`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0039_mesa_do_gestor.sql apps/web/src/lib/database.types.ts
git commit -m "Mesa do Gestor: grupo de empresas, campos da mesa e categoria pasta_da_obra"
```

---

### Task 2: Regras puras da mesa (`lib/mesa.ts`)

**Files:**
- Create: `apps/web/src/lib/mesa.ts`
- Test: `apps/web/src/lib/mesa.test.ts`

**Interfaces:**
- Consumes: `Alerta` de `@/lib/alertas`; `somarDias` de `@/lib/formato`.
- Produces:
```ts
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
export function montarMesa(d: DadosMesa, f: FiltroMesa): Record<Caixa, ItemMesa[]>;
```

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, expect, it } from "vitest";
import { montarMesa, type DadosMesa } from "./mesa";

const base: DadosMesa = { hoje: "2026-11-26", empresaDaObra: { o1: "L7", o2: "CDN" }, decisoes: [], medicoesPendentes: [], aditivosPendentes: [], tarefasDelegadas: [], vencimentos: [], riscosCriticos: [], alertas: [] };
const todos = { empresas: null, obraId: null, area: null };
const dec = (x = {}) => ({ id: "d1", tipo: "decisao" as const, problema: "Segurar aço Ø80", area: "compras" as const, obra_id: "o2", empresa_id: null, recomendacao: "Segurar", prazo: "2026-11-30", adiar_ate: null, responsavel: null, ...x });

describe("caixa DECIDIR", () => {
  it("mostra decisão pendente com recomendação e empresa da obra", () => {
    const m = montarMesa({ ...base, decisoes: [dec()] }, todos);
    expect(m.decidir).toHaveLength(1);
    expect(m.decidir[0]).toMatchObject({ titulo: "Segurar aço Ø80", empresaId: "CDN", area: "compras", recomendacao: "Segurar", decisaoId: "d1" });
  });
  it("esconde decisão adiada até a data", () => {
    expect(montarMesa({ ...base, decisoes: [dec({ adiar_ate: "2026-12-01" })] }, todos).decidir).toHaveLength(0);
    expect(montarMesa({ ...base, decisoes: [dec({ adiar_ate: "2026-11-26" })] }, todos).decidir).toHaveLength(1);
  });
  it("aprovação vai para APROVAR", () => {
    const m = montarMesa({ ...base, decisoes: [dec({ tipo: "aprovacao" })] }, todos);
    expect(m.decidir).toHaveLength(0);
    expect(m.aprovar).toHaveLength(1);
  });
  it("ordena por prazo mais próximo", () => {
    const m = montarMesa({ ...base, decisoes: [dec({ id: "a", prazo: "2026-12-10" }), dec({ id: "b", prazo: "2026-11-27" })] }, todos);
    expect(m.decidir.map((i) => i.decisaoId)).toEqual(["b", "a"]);
  });
});

describe("caixa APROVAR", () => {
  it("inclui medições e aditivos pendentes como financeiro", () => {
    const m = montarMesa({ ...base, medicoesPendentes: [{ id: "m1", contrato_id: "c1", numero: "3", obra_id: "o1", situacao: "enviada", data_fim: "2026-11-20" }], aditivosPendentes: [{ id: "a1", contrato_id: "c1", numero: "1", obra_id: "o1" }] }, todos);
    expect(m.aprovar.map((i) => i.area)).toEqual(["financeiro", "financeiro"]);
  });
});

describe("caixa COBRAR", () => {
  it("entra tarefa vencida ou parada há 7 dias; não entra a em dia", () => {
    const t = (id: string, prazo: string | null, atualizado: string) => ({ id, titulo: id, obra_id: "o1", prazo, responsavel: "João", atualizado_em: atualizado });
    const m = montarMesa({ ...base, tarefasDelegadas: [t("vencida", "2026-11-20", "2026-11-25T10:00:00Z"), t("parada", null, "2026-11-18T10:00:00Z"), t("ok", "2026-12-05", "2026-11-25T10:00:00Z")] }, todos);
    expect(m.cobrar.map((i) => i.chave).sort()).toEqual(["tarefa:parada", "tarefa:vencida"]);
  });
});

describe("caixa ALERTAS e filtros", () => {
  it("vencimento em até 15 dias entra; além disso não", () => {
    const v = (data: string) => ({ registro_id: data, tipo: "marco", descricao: "x", obra_id: "o1", data });
    expect(montarMesa({ ...base, vencimentos: [v("2026-12-10"), v("2026-12-20")] }, todos).alertas).toHaveLength(1);
  });
  it("filtra por empresa e por área", () => {
    const d = { ...base, decisoes: [dec({ id: "x", obra_id: "o1", area: "obras" }), dec({ id: "y", obra_id: "o2" })] };
    expect(montarMesa(d, { empresas: ["L7"], obraId: null, area: null }).decidir.map((i) => i.decisaoId)).toEqual(["x"]);
    expect(montarMesa(d, { empresas: null, obraId: null, area: "compras" }).decidir.map((i) => i.decisaoId)).toEqual(["y"]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test -w @cc/web -- mesa`
Expected: FAIL (módulo `./mesa` não existe).

- [ ] **Step 3: Implementar**

```ts
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
    if (!v.data || v.data < d.hoje || v.data > limiteVenc) continue;
    add({ chave: `venc:${v.tipo}:${v.registro_id}`, caixa: "alertas", titulo: v.descricao ?? "Vencimento", obraId: v.obra_id, area: v.tipo === "recebimento_previsto" ? "financeiro" : "obras", responsavel: null, prazo: v.data, gravidade: 2, recomendacao: null, href: v.obra_id ? `/obras/${v.obra_id}` : "/alertas", decisaoId: null });
  }
  for (const r of d.riscosCriticos) add({ chave: `risco:${r.id}`, caixa: "alertas", titulo: `Risco crítico: ${r.titulo}`, obraId: r.obra_id, area: "obras", responsavel: null, prazo: null, gravidade: 3, recomendacao: null, href: r.obra_id ? `/obras/${r.obra_id}` : "/alertas", decisaoId: null });
  for (const a of d.alertas) add({ chave: `alerta:${a.texto}`, caixa: "alertas", titulo: a.texto, obraId: null, area: AREA_DO_ALERTA[a.grupo], responsavel: null, prazo: null, gravidade: a.grave ? 3 : 1, recomendacao: null, href: a.href, decisaoId: null });

  const passa = (i: ItemMesa) =>
    (!f.empresas || (i.empresaId !== null && f.empresas.includes(i.empresaId))) &&
    (!f.obraId || i.obraId === f.obraId) &&
    (!f.area || i.area === f.area);
  const ordem = (a: ItemMesa, b: ItemMesa) => (a.prazo ?? "9999") .localeCompare(b.prazo ?? "9999") || b.gravidade - a.gravidade;

  const caixas: Record<Caixa, ItemMesa[]> = { decidir: [], aprovar: [], cobrar: [], alertas: [] };
  for (const i of itens.filter(passa)) caixas[i.caixa].push(i);
  for (const c of Object.keys(caixas) as Caixa[]) caixas[c].sort(ordem);
  return caixas;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test -w @cc/web -- mesa`
Expected: PASS (todos os testes de `mesa.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/mesa.ts apps/web/src/lib/mesa.test.ts
git commit -m "Mesa do Gestor: regras das 4 caixas com testes"
```

---

### Task 3: Carregar os dados da mesa (`lib/mesa-dados.ts`)

**Files:**
- Create: `apps/web/src/lib/mesa-dados.ts`

**Interfaces:**
- Consumes: `montarMesa`, `DadosMesa`, `FiltroMesa`, `Area` (Task 2); `carregarAlertas` de `@/lib/alertas-dados`; `hojeSP` de `@/lib/formato`.
- Produces:
```ts
export type EmpresaMesa = { id: string; nome: string; tipo: "grupo" | "empresa" | "marca"; mae: string | null };
export function lerFiltroMesa(p: Record<string, string | string[] | undefined>, empresas: EmpresaMesa[]): FiltroMesa;
export async function carregarMesa(supabase: Cliente, p: Record<string, string | string[] | undefined>): Promise<{ caixas: Record<Caixa, ItemMesa[]>; empresas: EmpresaMesa[]; obras: { id: string; nome: string }[]; nomeObra: Map<string, string>; nomeEmpresa: Map<string, string>; filtro: FiltroMesa; erro: string | null }>;
```

- [ ] **Step 1: Implementar**

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { carregarAlertas } from "@/lib/alertas-dados";
import { hojeSP } from "@/lib/formato";
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
  const [empresas, obras, decisoes, medicoes, aditivos, tarefas, vencimentos, riscos, alertas] = await Promise.all([
    supabase.from("empresas").select("id, razao_social, nome_fantasia, tipo, empresa_mae_id").is("arquivado_em", null).order("razao_social"),
    supabase.from("obras").select("id, nome, empresa_id").is("arquivado_em", null).order("nome"),
    supabase.from("decisoes").select("id, tipo, problema, area, obra_id, empresa_id, recomendacao, prazo, adiar_ate, pessoas:responsavel_id(nome)").eq("status", "pendente"),
    supabase.from("medicoes").select("id, contrato_id, numero, situacao, data_fim, contratos(obra_id)").in("situacao", ["elaborada", "enviada"]),
    supabase.from("aditivos").select("id, contrato_id, numero, contratos(obra_id)").eq("situacao", "em_analise"),
    supabase.from("tarefas").select("id, titulo, obra_id, prazo, atualizado_em, pessoas:responsavel_id(nome, eh_usuario)").is("concluida_em", null).not("responsavel_id", "is", null),
    supabase.from("v_vencimentos").select("registro_id, tipo, descricao, obra_id, data").gte("data", hoje),
    supabase.from("v_riscos_criticos").select("id, titulo, obra_id"),
    carregarAlertas(supabase),
  ]);
  const falhou = [empresas, obras, decisoes, medicoes, aditivos, tarefas, vencimentos, riscos].find((r) => r.error);

  const listaEmpresas: EmpresaMesa[] = (empresas.data ?? []).map((e) => ({ id: e.id, nome: e.nome_fantasia ?? e.razao_social, tipo: e.tipo as EmpresaMesa["tipo"], mae: e.empresa_mae_id }));
  const empresaDaObra = Object.fromEntries((obras.data ?? []).filter((o) => o.empresa_id).map((o) => [o.id, o.empresa_id as string]));
  const filtro = lerFiltroMesa(p, listaEmpresas);

  const caixas: Record<Caixa, ItemMesa[]> = montarMesa({
    hoje,
    empresaDaObra,
    decisoes: (decisoes.data ?? []).map((x) => ({ id: x.id, tipo: x.tipo as "decisao" | "aprovacao", problema: x.problema, area: x.area as Area | null, obra_id: x.obra_id, empresa_id: x.empresa_id, recomendacao: x.recomendacao, prazo: x.prazo, adiar_ate: x.adiar_ate, responsavel: (x.pessoas as { nome: string } | null)?.nome ?? null })),
    medicoesPendentes: (medicoes.data ?? []).map((m) => ({ id: m.id, contrato_id: m.contrato_id, numero: m.numero != null ? String(m.numero) : null, obra_id: (m.contratos as { obra_id: string | null } | null)?.obra_id ?? null, situacao: m.situacao, data_fim: m.data_fim })),
    aditivosPendentes: (aditivos.data ?? []).map((a) => ({ id: a.id, contrato_id: a.contrato_id, numero: a.numero != null ? String(a.numero) : null, obra_id: (a.contratos as { obra_id: string | null } | null)?.obra_id ?? null })),
    tarefasDelegadas: (tarefas.data ?? [])
      .filter((t) => !(t.pessoas as { eh_usuario: boolean } | null)?.eh_usuario)
      .map((t) => ({ id: t.id, titulo: t.titulo, obra_id: t.obra_id, prazo: t.prazo, responsavel: (t.pessoas as { nome: string } | null)?.nome ?? "—", atualizado_em: t.atualizado_em })),
    vencimentos: vencimentos.data ?? [],
    riscosCriticos: (riscos.data ?? []).map((r) => ({ id: r.id as string, titulo: (r.titulo as string) ?? "Risco", obra_id: r.obra_id as string | null })),
    alertas,
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
```

Nota para o implementador: confira os nomes reais das colunas de `medicoes` (`numero`, `data_fim`) e de `v_riscos_criticos` em `database.types.ts`; se diferirem, ajuste só o `select` e o mapeamento, mantendo a forma de `DadosMesa`.

- [ ] **Step 2: Checar compilação**

Run: `npm run typecheck -w @cc/web`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/mesa-dados.ts
git commit -m "Mesa do Gestor: carga de dados e filtro por empresa do grupo"
```

---

### Task 4: Tela da Mesa em `/` e painel antigo em `/painel`

**Files:**
- Create: `apps/web/src/app/(app)/painel/page.tsx` (conteúdo atual de `apps/web/src/app/(app)/page.tsx`, sem mudanças de lógica)
- Modify: `apps/web/src/app/(app)/page.tsx` (passa a ser a Mesa)
- Create: `apps/web/src/app/(app)/mesa/caixa.tsx`
- Modify: `apps/web/src/lib/navegacao.ts` (item "Mesa do Gestor" em `/` e "Painel executivo" em `/painel`)

**Interfaces:**
- Consumes: `carregarMesa`, `EmpresaMesa` (Task 3); `ItemMesa`, `Caixa` (Task 2); `Cartao`, `EstadoVazio`, `Etiqueta` de `@/components/ui`; `exigirSessaoCompleta` de `@/lib/sessao`.
- Produces: componente `CaixaMesa({ titulo, itens, nomeObra, nomeEmpresa, vazio })`; links `/?item=<decisaoId>` para o detalhe (Task 5).

- [ ] **Step 1: Mover o painel**

Run: `git mv "apps/web/src/app/(app)/page.tsx" "apps/web/src/app/(app)/painel/page.tsx"` e trocar no arquivo movido o `metadata` para `{ title: "Painel executivo" }` e os links/forms que apontam para `"/"` para `"/painel"`.

- [ ] **Step 2: Componente da caixa**

```tsx
import Link from "next/link";
import { Cartao, EstadoVazio, Etiqueta } from "@/components/ui";
import { dataCivil } from "@/lib/formato";
import type { ItemMesa } from "@/lib/mesa";

const NOME_AREA = { obras: "Obras", compras: "Compras", pessoas: "Pessoas", financeiro: "Financeiro" } as const;

export function CaixaMesa({ titulo, itens, nomeObra, nomeEmpresa, vazio }: { titulo: string; itens: ItemMesa[]; nomeObra: Map<string, string>; nomeEmpresa: Map<string, string>; vazio: string }) {
  return (
    <Cartao titulo={`${titulo} (${itens.length})`}>
      {itens.length === 0 ? <EstadoVazio>{vazio}</EstadoVazio> : (
        <ul className="divide-y divide-borda">
          {itens.map((i) => (
            <li key={i.chave}>
              <Link href={i.href} className="block py-2.5 text-sm hover:text-marca">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{i.titulo}</span>
                  {i.prazo && <Etiqueta tom={i.gravidade >= 3 ? "alerta" : "atencao"}>{dataCivil(i.prazo)}</Etiqueta>}
                </div>
                <div className="mt-0.5 text-xs text-suave">
                  {[i.empresaId ? nomeEmpresa.get(i.empresaId) : null, i.obraId ? nomeObra.get(i.obraId) : null, NOME_AREA[i.area], i.responsavel].filter(Boolean).join(" · ")}
                </div>
                {i.recomendacao && <div className="mt-1 text-xs"><strong>Recomendação:</strong> {i.recomendacao}</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
```

- [ ] **Step 3: Página da Mesa**

```tsx
import type { Metadata } from "next";
import { CaixaMesa } from "./mesa/caixa";
import { DetalheItem } from "./mesa/detalhe";
import { carregarMesa } from "@/lib/mesa-dados";
import { exigirSessaoCompleta } from "@/lib/sessao";

export const metadata: Metadata = { title: "Mesa do Gestor" };

export default async function MesaDoGestor({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const { supabase } = await exigirSessaoCompleta();
  const m = await carregarMesa(supabase, p);
  const item = typeof p.item === "string" ? p.item : null;
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mesa do Gestor</h1>
        <p className="text-sm text-suave">Só o que precisa da sua direção no Grupo C.Salles.</p>
      </div>
      <form className="flex flex-wrap gap-2 text-sm">
        <select name="empresa" defaultValue={typeof p.empresa === "string" ? p.empresa : ""} className="rounded border border-borda px-2 py-1">
          <option value="">Grupo inteiro</option>
          {m.empresas.filter((e) => e.tipo !== "grupo").map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select name="obra" defaultValue={m.filtro.obraId ?? ""} className="rounded border border-borda px-2 py-1">
          <option value="">Todas as obras</option>
          {m.obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
        <select name="area" defaultValue={m.filtro.area ?? ""} className="rounded border border-borda px-2 py-1">
          <option value="">Todas as áreas</option>
          <option value="obras">Obras e execução</option>
          <option value="compras">Compras e suprimentos</option>
          <option value="pessoas">Pessoas</option>
          <option value="financeiro">Financeiro, contratos e licitações</option>
        </select>
        <button className="rounded bg-marca px-3 py-1 text-white">Filtrar</button>
      </form>
      {m.erro && <p className="text-sm text-alerta">{m.erro}</p>}
      {item && <DetalheItem decisaoId={item} />}
      <div className="grid gap-4 md:grid-cols-2">
        <CaixaMesa titulo="🔴 Decidir" itens={m.caixas.decidir} nomeObra={m.nomeObra} nomeEmpresa={m.nomeEmpresa} vazio="Nada para decidir agora." />
        <CaixaMesa titulo="🟠 Aprovar" itens={m.caixas.aprovar} nomeObra={m.nomeObra} nomeEmpresa={m.nomeEmpresa} vazio="Nada aguardando aprovação." />
        <CaixaMesa titulo="🟡 Cobrar" itens={m.caixas.cobrar} nomeObra={m.nomeObra} nomeEmpresa={m.nomeEmpresa} vazio="Nenhuma entrega atrasada." />
        <CaixaMesa titulo="⚠️ Alertas" itens={m.caixas.alertas} nomeObra={m.nomeObra} nomeEmpresa={m.nomeEmpresa} vazio="Nenhum alerta." />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Navegação**

Em `MODULOS` de `apps/web/src/lib/navegacao.ts`, trocar a primeira linha por:
```ts
  { slug: "", href: "/", titulo: "Mesa do Gestor", descricao: "Só o que precisa da sua direção", icone: "painel", fase: 3, grupo: "Visão geral" },
  { slug: "painel", href: "/painel", titulo: "Painel executivo", descricao: "Visão executiva consolidada das obras", icone: "painel", fase: 3, grupo: "Visão geral" },
```

- [ ] **Step 5: Checar**

Run: `npm run typecheck -w @cc/web` e `npm run test -w @cc/web`
Expected: sem erros; testes existentes continuam passando (se algum teste de navegação conta itens, atualizar a contagem esperada).

- [ ] **Step 6: Commit**

```bash
git add -A "apps/web/src/app/(app)" apps/web/src/lib/navegacao.ts
git commit -m "Mesa do Gestor vira a tela inicial; painel executivo vai para /painel"
```

---

### Task 5: Ações Decidido / Delegar / Adiar

**Files:**
- Create: `apps/web/src/app/(app)/mesa/acoes.ts`
- Create: `apps/web/src/app/(app)/mesa/detalhe.tsx`

**Interfaces:**
- Consumes: `exigirSessaoCompleta`; `espelharNoTrello` de `@/lib/espelho-trello` (mesma assinatura usada em `tarefas/acoes.ts`); `hojeSP`.
- Produces: `decidirItem(id: string, fd: FormData)`, `delegarItem(id: string, fd: FormData)`, `adiarItem(id: string, fd: FormData)` (server actions); componente `DetalheItem({ decisaoId })`.

- [ ] **Step 1: Server actions**

```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hojeSP, somarDias } from "@/lib/formato";
import { exigirSessaoCompleta } from "@/lib/sessao";
import { UUID } from "@/lib/obras";

const texto = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function decidirItem(id: string, fd: FormData) {
  if (!UUID.test(id)) return;
  const { supabase } = await exigirSessaoCompleta();
  const decisao = texto(fd, "decisao");
  if (!decisao) redirect(`/?item=${id}&erro=decisao`);
  await supabase.from("decisoes").update({ decisao, status: "tomada", data_decisao: hojeSP() }).eq("id", id);
  revalidatePath("/");
  redirect("/");
}

export async function delegarItem(id: string, fd: FormData) {
  if (!UUID.test(id)) return;
  const { supabase } = await exigirSessaoCompleta();
  const responsavel = texto(fd, "responsavel_id");
  const prazo = texto(fd, "prazo") || null;
  const { data: d } = await supabase.from("decisoes").select("problema, obra_id").eq("id", id).single();
  if (!d || !UUID.test(responsavel)) redirect(`/?item=${id}&erro=delegar`);
  const { data: t } = await supabase.from("tarefas").insert({ titulo: d.problema, obra_id: d.obra_id, responsavel_id: responsavel, prazo, fonte: "manual", tipo: "tarefa" }).select("id").single();
  // sai de DECIDIR até o prazo (ou 7 dias); se a tarefa atrasar, aparece em COBRAR
  await supabase.from("decisoes").update({ responsavel_id: responsavel, prazo, tarefa_id: t?.id ?? null, adiar_ate: prazo ?? somarDias(hojeSP(), 7) }).eq("id", id);
  revalidatePath("/");
  redirect("/");
}

export async function adiarItem(id: string, fd: FormData) {
  if (!UUID.test(id)) return;
  const { supabase } = await exigirSessaoCompleta();
  const ate = texto(fd, "adiar_ate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ate)) redirect(`/?item=${id}&erro=adiar`);
  await supabase.from("decisoes").update({ adiar_ate: ate }).eq("id", id);
  revalidatePath("/");
  redirect("/");
}
```

Nota: no `delegarItem`, logo depois do `insert` da tarefa, chamar o mesmo espelhamento no Trello que `salvarTarefa` usa em `apps/web/src/app/(app)/tarefas/acoes.ts` (copiar a chamada exata de `espelharNoTrello` de lá), para o cartão nascer no quadro. A decisão continua `pendente` até ser marcada como decidida.

- [ ] **Step 2: Detalhe**

```tsx
import { adiarItem, decidirItem, delegarItem } from "./acoes";
import { Cartao } from "@/components/ui";
import { exigirSessaoCompleta } from "@/lib/sessao";

export async function DetalheItem({ decisaoId }: { decisaoId: string }) {
  const { supabase } = await exigirSessaoCompleta();
  const [{ data: d }, { data: pessoas }] = await Promise.all([
    supabase.from("decisoes").select("id, problema, recomendacao, principio, impacto, prazo").eq("id", decisaoId).maybeSingle(),
    supabase.from("pessoas").select("id, nome").is("arquivado_em", null).eq("eh_usuario", false).order("nome"),
  ]);
  if (!d) return null;
  return (
    <Cartao titulo={d.problema}>
      <dl className="space-y-1 text-sm">
        {d.recomendacao && <div><dt className="inline font-semibold">Recomendação: </dt><dd className="inline">{d.recomendacao}</dd></div>}
        {d.principio && <div><dt className="inline font-semibold">Por quê: </dt><dd className="inline">{d.principio}</dd></div>}
        {d.impacto && <div><dt className="inline font-semibold">Impacto: </dt><dd className="inline">{d.impacto}</dd></div>}
      </dl>
      <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
        <form action={decidirItem.bind(null, d.id)} className="space-y-1">
          <textarea name="decisao" required defaultValue={d.recomendacao ?? ""} className="w-full rounded border border-borda p-1" />
          <button className="rounded bg-marca px-3 py-1 text-white">Decidido</button>
        </form>
        <form action={delegarItem.bind(null, d.id)} className="space-y-1">
          <select name="responsavel_id" required className="w-full rounded border border-borda p-1">
            {(pessoas ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <input type="date" name="prazo" className="w-full rounded border border-borda p-1" />
          <button className="rounded border border-borda px-3 py-1">Delegar</button>
        </form>
        <form action={adiarItem.bind(null, d.id)} className="space-y-1">
          <input type="date" name="adiar_ate" required className="w-full rounded border border-borda p-1" />
          <button className="rounded border border-borda px-3 py-1">Adiar</button>
        </form>
      </div>
    </Cartao>
  );
}
```

- [ ] **Step 3: Checar**

Run: `npm run typecheck -w @cc/web` e `npm run lint -w @cc/web`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(app)/mesa"
git commit -m "Mesa do Gestor: decidir, delegar (vira tarefa/Trello) e adiar"
```

---

### Task 6: Pastas extras pelo nome (agente + tela de documentos)

**Files:**
- Modify: `agente-local/cc_agente/documentos.py` (`categoria_de`)
- Modify: `agente-local/tests/test_documentos.py`
- Modify: tela que exibe a categoria em `apps/web/src/app/(app)/documentos/page.tsx` (e o mapa de rótulos em `apps/web/src/lib/documentos.ts`, se for lá)

**Interfaces:**
- Produces: `categoria_de("16-pastas-compartilhadas/a.pdf") == "pasta_da_obra"`; na tela, documento com categoria `pasta_da_obra` mostra o 1º segmento de `pasta` sem o número (ex.: "Plano de Retomada").

- [ ] **Step 1: Ajustar o teste (falha)**

No parametrize de `test_categoria_vem_da_pasta`, trocar `("16-pastas-compartilhadas/a.pdf", "outro")` por:
```python
    ("16-pastas-compartilhadas/a.pdf", "pasta_da_obra"),
    ("17_Plano_de_Retomada/x.xlsx", "pasta_da_obra"),
    ("98_OBSOLETOS/a.pdf", "outro"),
```
Run: `cd C:/dev/centro-de-comando/agente-local && py -m pytest tests/test_documentos.py -q`
Expected: FAIL nos casos 16 e 17.

- [ ] **Step 2: Implementar**

```python
def categoria_de(relativo: str) -> str:
    """A categoria vem do prefixo da pasta de primeiro nível (RN-71). 16–97 = pasta própria da obra."""
    partes = relativo.split("/")
    if len(partes) < 2:
        return "outro"
    achado = re.match(r"(\d{2})[_ -]", partes[0])
    if not achado:
        return "outro"
    numero = achado.group(1)
    if numero in CATEGORIAS:
        return CATEGORIAS[numero]
    return "pasta_da_obra" if 16 <= int(numero) <= 97 else "outro"
```
Run: `py -m pytest tests/test_documentos.py -q`
Expected: PASS.

- [ ] **Step 3: Rótulo na tela**

Onde a interface traduz a categoria para texto (procurar `orcamento_licitacao` em `apps/web/src`), acrescentar `pasta_da_obra: "Pasta da obra"` e, na listagem, quando `categoria === "pasta_da_obra"`, exibir `doc.pasta?.split("/")[0].replace(/^\d{2}[_ -]+/, "").replace(/[_-]+/g, " ")`.
Run: `npm run typecheck -w @cc/web && npm run test -w @cc/web`
Expected: sem erros.

- [ ] **Step 4: Reindexar e conferir**

Run: `cd C:/dev/centro-de-comando/agente-local && py -m cc_agente.documentos`
Run: `npx.cmd supabase db query --remote --yes "select categoria, count(*) from public.documentos where arquivado_em is null and caminho_local like '%PRF-RECANTO%' group by 1"`
Expected: aparece `pasta_da_obra` e cai a contagem de `outro` do PRF.

- [ ] **Step 5: Commit**

```bash
git add agente-local/cc_agente/documentos.py agente-local/tests/test_documentos.py apps/web/src
git commit -m "Pastas extras das obras (16+) aparecem pelo nome"
```

---

### Task 7: Vincular obras às empresas, conferir na tela e documentar

**Files:**
- Modify: `docs/MANUAL_DE_USO.md` (seção "Mesa do Gestor")
- Modify: `docs/REGRAS_DE_NEGOCIO.md` (regras das 4 caixas, prazos 7 e 15 dias)

- [ ] **Step 1: Confirmar com o Arthur o vínculo obra → empresa**
Proposta: PRF, Senado, ANP, Candangolândia → L7 Construtora; NILLS, Levorsse (container/manutenção) → CDN Engenharia. Só seguir com o ok dele.

- [ ] **Step 2: Gravar o vínculo**

```sql
update public.obras set empresa_id = (select id from public.empresas where nome_fantasia = 'L7 Construtora')
 where nome ilike any (array['%PRF%','%Senado%','%ANP%','%Candang%']);
update public.obras set empresa_id = (select id from public.empresas where nome_fantasia = 'CDN Engenharia')
 where nome ilike any (array['%NILLS%','%Levorsse%','%container%','%manuten%']);
```
Run via `npx.cmd supabase db query --remote --yes "<sql>"` e conferir com `select nome, empresa_id from public.obras order by nome`.

- [ ] **Step 3: Lançar 1 decisão real de teste**

```sql
select public.lancar_item_mesa('decisao','NILLS: segurar pedido de aço Ø80 até a Sondex corrigir a armadura','compras',
  (select id from public.obras where nome ilike '%NILLS%' limit 1), null,
  'Segurar o pedido do aço Ø80; comprar só concreto dos furos-teste.',
  'Não comprar antes do projeto liberado (planejamento em ondas).',
  'Evita ~7,7 t de aço errado.', '2026-11-30');
```

- [ ] **Step 4: Conferir no navegador**
Run: `npm run dev` e abrir `http://localhost:3000/` (preview). Conferir: 4 caixas; a decisão de teste em DECIDIR com recomendação; filtro "CDN Engenharia" mantém a NILLS e "L7" a esconde; "Adiar" tira o item até a data; `/painel` abre o painel antigo.

- [ ] **Step 5: Documentar e commit**

Acrescentar ao `MANUAL_DE_USO.md` uma seção curta "Mesa do Gestor" (o que é cada caixa, como decidir/delegar/adiar) e ao `REGRAS_DE_NEGOCIO.md` as regras (pendente + não adiada; medições elaborada/enviada; aditivos em_analise; COBRAR = vencida ou 7 dias sem movimento; ALERTAS = vencimentos até 15 dias + riscos críticos + alertas RN-83).
```bash
git add docs/MANUAL_DE_USO.md docs/REGRAS_DE_NEGOCIO.md
git commit -m "Documentação da Mesa do Gestor"
```
