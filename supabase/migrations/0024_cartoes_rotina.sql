-- 0024 — Cartões de rotina (ADR 0017, RN-49b)
-- Cartões renovados sempre, como pedidos de compra, medem volume pelos itens de checklist, não por prazo.
-- A marcação é decisão do proprietário: fica só no sistema, com auditoria, e nada é gravado no Trello.

create table public.cartoes_rotina (
  tarefa_id      uuid primary key references public.tarefas(id) on delete cascade,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
comment on table public.cartoes_rotina is 'Cartões do Trello marcados pelo proprietário como rotina: saem da taxa de eficiência e contam pelos itens.';

select app.aplicar_padroes('public.cartoes_rotina');

alter table public.trello_checklist_itens add column membro_id uuid references public.trello_membros(id) on delete set null;
alter table public.trello_checklist_itens add column criado_no_trello timestamptz;
alter table public.trello_checklist_itens add column concluido_em timestamptz;
comment on column public.trello_checklist_itens.membro_id is 'Membro atribuído ao item. Sem ele, o crédito vai para os membros do cartão.';
