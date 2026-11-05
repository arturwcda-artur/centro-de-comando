-- 0021 — Membros, comentários e checklists do Trello, só do quadro Obras do Grupo - C.SALLES (ADR 0017, RN-49)
-- Espelho sem auditoria, de propósito: o texto vem de terceiros e, se uma credencial passar pelo
-- filtro RN-66, some na sincronização seguinte em vez de ficar guardada na auditoria imutável.

create table public.trello_membros (
  id             uuid primary key default gen_random_uuid(),
  id_externo     text not null unique,
  nome           text not null,
  usuario        text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
comment on table public.trello_membros is 'Membros do Trello. Ficam fora de pessoas para não misturar com o cadastro da empresa.';

create table public.tarefa_membros (
  tarefa_id      uuid not null references public.tarefas(id) on delete cascade,
  membro_id      uuid not null references public.trello_membros(id) on delete cascade,
  criado_em      timestamptz not null default now(),
  primary key (tarefa_id, membro_id)
);
create index tarefa_membros_membro_idx on public.tarefa_membros (membro_id);

create table public.trello_comentarios (
  id             uuid primary key default gen_random_uuid(),
  tarefa_id      uuid not null references public.tarefas(id) on delete cascade,
  id_externo     text not null unique,
  autor          text,
  texto          text not null,
  data           timestamptz not null,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index trello_comentarios_tarefa_idx on public.trello_comentarios (tarefa_id, data);

create table public.trello_checklist_itens (
  id             uuid primary key default gen_random_uuid(),
  tarefa_id      uuid not null references public.tarefas(id) on delete cascade,
  id_externo     text not null unique,
  checklist      text not null,
  nome           text not null,
  concluido      boolean not null default false,
  posicao        numeric not null default 0,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index trello_checklist_tarefa_idx on public.trello_checklist_itens (tarefa_id);

select app.aplicar_padroes('public.trello_membros', false);
select app.aplicar_padroes('public.tarefa_membros', false);
select app.aplicar_padroes('public.trello_comentarios', false);
select app.aplicar_padroes('public.trello_checklist_itens', false);
