-- 0017 — Gravação nas ferramentas de origem, com autorização e registro (ADR 0013, RN-64, RN-48)
-- O proprietário autorizou em 04/11/2026 que o sistema conclua as tarefas DELE no Trello e no Notion.
-- Cartões de terceiros continuam só leitura. Nada é excluído nas ferramentas de origem.

create table public.operacoes_externas (
  id            uuid primary key default gen_random_uuid(),
  ferramenta    text not null check (ferramenta in ('trello','notion','google_agenda')),
  operacao      text not null check (operacao in ('concluir')),
  entidade      text not null default 'tarefas',
  registro_id   uuid not null,
  id_externo    text not null,
  status        text not null default 'pendente' check (status in ('pendente','sucesso','erro')),
  detalhe       text,
  erro          text,
  executado_em  timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
comment on table public.operacoes_externas is 'Toda gravação feita numa ferramenta externa: o quê, onde, quando e com qual resultado.';
create index operacoes_externas_recentes_idx on public.operacoes_externas (criado_em desc);

select app.aplicar_padroes('public.operacoes_externas');

-- Registra a autorização. O CHECK de conectores exige escrita_autorizada_em para o modo leitura_escrita.
update public.conectores
   set modo = 'leitura_escrita', escrita_autorizada_em = '2026-11-04T12:00:00-03:00'
 where ferramenta in ('trello','notion');
