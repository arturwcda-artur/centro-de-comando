-- 0032 — Problemas no próprio sistema (decisão do proprietário em 12/11/2026, ADR 0023)
-- A planilha da Central de Gestão deixa de ser a fonte: os problemas e as ações 5W2H passam a ser
-- cadastrados aqui. As ações lidas da planilha entram uma única vez e a leitura é desligada.

create table public.problemas (
  id              uuid primary key default gen_random_uuid(),
  obra_id         uuid references public.obras(id) on delete set null,
  titulo          text not null,
  descricao       text,
  responsavel_id  uuid references public.pessoas(id) on delete set null,
  gravidade       smallint not null default 3 check (gravidade between 1 and 5),
  urgencia        smallint not null default 3 check (urgencia between 1 and 5),
  tendencia       smallint not null default 3 check (tendencia between 1 and 5),
  gut             smallint generated always as (gravidade * urgencia * tendencia) stored,
  status          text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'resolvido', 'cancelado')),
  resolvido_em    timestamptz,
  origem          text not null default 'sistema' check (origem in ('sistema', 'planilha')),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  check ((status = 'resolvido') = (resolvido_em is not null))
);
comment on table public.problemas is 'Problemas das obras, priorizados por G × U × T. Cada um tem ações 5W2H em tarefas.problema_id.';
create index problemas_abertos_idx on public.problemas (gut desc) where status in ('aberto', 'em_andamento');

select app.aplicar_padroes('public.problemas');

alter table public.tarefas add column problema_id uuid references public.problemas(id) on delete set null;
create index tarefas_problema_idx on public.tarefas (problema_id) where problema_id is not null;
comment on column public.tarefas.problema_id is 'Problema que esta ação 5W2H resolve.';

-- Cada linha da planilha vira um problema com a sua ação, e a ação passa a ser editável no sistema
with lidas as (
  select t.id as tarefa_id, t.obra_id, t.responsavel_id, t.status, t.concluida_em,
         coalesce(d.o_que, regexp_replace(t.titulo, '^\[\d+\]\s*', '')) as titulo,
         coalesce(d.gravidade, 3) g, coalesce(d.urgencia, 3) u, coalesce(d.tendencia, 3) tt,
         gen_random_uuid() as problema_id
    from public.tarefas t
    left join public.acoes_detalhes d on d.tarefa_id = t.id
   where t.fonte = 'planilha'
),
novos as (
  insert into public.problemas (id, obra_id, titulo, responsavel_id, gravidade, urgencia, tendencia, status, resolvido_em, origem)
  select problema_id, obra_id, left(titulo, 500), responsavel_id, g, u, tt,
         case status when 'concluida' then 'resolvido' when 'cancelada' then 'cancelado' when 'a_fazer' then 'aberto' else 'em_andamento' end,
         case when status = 'concluida' then coalesce(concluida_em, now()) end,
         'planilha'
    from lidas
  returning id
)
update public.tarefas t
   set problema_id = l.problema_id, fonte = 'manual', status_sync = 'local'
  from lidas l
 where t.id = l.tarefa_id and l.problema_id in (select id from novos);

-- A planilha deixa de ser lida: sem cadastro, o agente não tem o que ler
delete from public.acoes_planilhas;
