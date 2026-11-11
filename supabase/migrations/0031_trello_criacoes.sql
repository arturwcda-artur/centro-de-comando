-- 0031 — Quem gera atividade no quadro da equipe (pedido do proprietário em 11/11/2026)
-- Cartões criados e checklists adicionados, lidos do histórico do Trello. O Trello não registra
-- quem cria cada item de checklist, então itens ficam de fora. Comentários já estão em trello_comentarios.

create table public.trello_criacoes (
  id             uuid primary key default gen_random_uuid(),
  tarefa_id      uuid not null references public.tarefas(id) on delete cascade,
  id_externo     text not null unique,
  tipo           text not null check (tipo in ('cartao', 'checklist')),
  membro_id      uuid references public.trello_membros(id) on delete set null,
  data           timestamptz not null,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
comment on table public.trello_criacoes is 'Cartões criados e checklists adicionados no quadro da equipe, e por quem.';
create index trello_criacoes_data_idx on public.trello_criacoes (data);

select app.aplicar_padroes('public.trello_criacoes', false);
