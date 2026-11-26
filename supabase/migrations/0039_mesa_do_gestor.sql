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
  -- auth.uid() nulo = chamada direta no banco (assistente via CLI); pelo app, só o proprietário
  if auth.uid() is not null and not app.is_proprietario() then
    raise exception 'sem permissão';
  end if;
  insert into public.decisoes (tipo, problema, area, obra_id, empresa_id, recomendacao, principio, impacto, prazo, fonte)
  values (p_tipo, p_problema, p_area, p_obra_id, p_empresa_id, p_recomendacao, p_principio, p_impacto, p_prazo, 'assistente')
  returning id into v_id;
  return v_id;
end $$;
comment on function public.lancar_item_mesa is 'Assistente lança um item DECIDIR/APROVAR na Mesa do Gestor.';
revoke execute on function public.lancar_item_mesa(text,text,text,uuid,uuid,text,text,text,date) from public, anon;
grant execute on function public.lancar_item_mesa(text,text,text,uuid,uuid,text,text,text,date) to authenticated;

-- Carga do grupo (idempotente). L7 e CDN já existiam (L7-CONSTRUTORA, CDN-ENGENHARIA): só ganham nome e grupo.
insert into public.empresas (razao_social, nome_fantasia, tipo)
select 'Grupo C.Salles', 'Grupo C.Salles', 'grupo'
where not exists (select 1 from public.empresas where razao_social = 'Grupo C.Salles');

update public.empresas set nome_fantasia = 'L7 Construtora', tipo = 'empresa',
  empresa_mae_id = (select id from public.empresas where razao_social = 'Grupo C.Salles')
 where razao_social = 'L7-CONSTRUTORA';
update public.empresas set nome_fantasia = 'CDN Engenharia', tipo = 'empresa',
  empresa_mae_id = (select id from public.empresas where razao_social = 'Grupo C.Salles')
 where razao_social = 'CDN-ENGENHARIA';

insert into public.empresas (razao_social, nome_fantasia, tipo, empresa_mae_id)
select v.n, v.n, v.t, (select id from public.empresas where razao_social = 'Grupo C.Salles')
from (values ('C.Salles Engenharia','empresa'),('Menrah Capital','marca'),('Paladino','marca'),('PIB School','marca')) v(n,t)
where not exists (select 1 from public.empresas e where e.razao_social = v.n or e.nome_fantasia = v.n);
