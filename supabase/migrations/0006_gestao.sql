-- 0006 — Gestão do dia a dia: tarefas, eventos, reuniões, riscos, decisões

create table public.tarefas (
  id                     uuid primary key default gen_random_uuid(),
  codigo                 bigint generated always as identity unique,
  titulo                 text not null,
  descricao              text,
  obra_id                uuid references public.obras(id) on delete set null,
  responsavel_id         uuid references public.pessoas(id) on delete set null,
  aguardando_pessoa_id   uuid references public.pessoas(id) on delete set null,
  tarefa_pai_id          uuid references public.tarefas(id) on delete set null,
  tipo                   text not null default 'acao' check (tipo in ('acao','cobranca','entrega','pendencia')),
  categoria              text,
  prazo                  date,
  importancia            smallint not null default 3 check (importancia between 1 and 5),
  impacto                smallint not null default 3 check (impacto between 1 and 5),
  critica                boolean not null default false,
  status                 text not null default 'a_fazer'
                         check (status in ('a_fazer','em_andamento','aguardando_terceiro','concluida','cancelada')),
  concluida_em           timestamptz,
  -- bloco de origem
  fonte                  text not null default 'manual',
  id_externo             text,
  importado_em           timestamptz,
  atualizado_em_origem   timestamptz,
  hash_conteudo          text,
  status_sync            text not null default 'local' check (status_sync in ('local','sincronizado','pendente','conflito','erro')),
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now(),
  unique (fonte, id_externo),
  check (status <> 'aguardando_terceiro' or aguardando_pessoa_id is not null),
  check ((status = 'concluida') = (concluida_em is not null))
);
comment on column public.tarefas.prazo is 'Prazo definido pelo usuário ou pela origem. O sistema nunca altera prazos automaticamente.';
create index tarefas_abertas_idx on public.tarefas (status, prazo) where status not in ('concluida','cancelada');
create index tarefas_obra_idx on public.tarefas (obra_id);

create table public.tarefa_dependencias (
  tarefa_id      uuid not null references public.tarefas(id) on delete cascade,
  depende_de_id  uuid not null references public.tarefas(id) on delete cascade,
  criado_em      timestamptz not null default now(),
  primary key (tarefa_id, depende_de_id),
  check (tarefa_id <> depende_de_id)
);

create table public.eventos (
  id                     uuid primary key default gen_random_uuid(),
  titulo                 text not null,
  descricao              text,
  inicio                 timestamptz not null,
  fim                    timestamptz,
  dia_inteiro            boolean not null default false,
  local                  text,
  obra_id                uuid references public.obras(id) on delete set null,
  tarefa_id              uuid references public.tarefas(id) on delete set null,
  calendario_externo_id  text,
  ical_uid               text,
  -- bloco de origem
  fonte                  text not null default 'manual',
  id_externo             text,
  importado_em           timestamptz,
  atualizado_em_origem   timestamptz,
  hash_conteudo          text,
  status_sync            text not null default 'local' check (status_sync in ('local','sincronizado','pendente','conflito','erro')),
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now(),
  unique (fonte, id_externo),
  check (fim is null or fim >= inicio)
);
create index eventos_inicio_idx on public.eventos (inicio);
create index eventos_obra_idx on public.eventos (obra_id);

create table public.reunioes (
  id                     uuid primary key default gen_random_uuid(),
  evento_id              uuid unique references public.eventos(id) on delete set null,
  obra_id                uuid references public.obras(id) on delete set null,
  titulo                 text not null,
  data                   date not null,
  pauta                  text,
  participantes          text[],
  ata                    text,
  -- bloco de origem
  fonte                  text not null default 'manual',
  id_externo             text,
  importado_em           timestamptz,
  atualizado_em_origem   timestamptz,
  hash_conteudo          text,
  status_sync            text not null default 'local' check (status_sync in ('local','sincronizado','pendente','conflito','erro')),
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now(),
  unique (fonte, id_externo)
);
create index reunioes_obra_idx on public.reunioes (obra_id, data desc);

create table public.riscos (
  id               uuid primary key default gen_random_uuid(),
  obra_id          uuid references public.obras(id) on delete cascade,
  descricao        text not null,
  origem           text,
  categoria        text,
  probabilidade    smallint not null check (probabilidade between 1 and 5),
  impacto          smallint not null check (impacto between 1 and 5),
  severidade       smallint generated always as (probabilidade * impacto) stored,
  responsavel_id   uuid references public.pessoas(id) on delete set null,
  prazo            date,
  plano_resposta   text,
  status           text not null default 'aberto' check (status in ('aberto','em_tratamento','mitigado','materializado','encerrado')),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index riscos_abertos_idx on public.riscos (severidade desc) where status in ('aberto','em_tratamento');

create table public.decisoes (
  id                     uuid primary key default gen_random_uuid(),
  obra_id                uuid references public.obras(id) on delete set null,
  reuniao_id             uuid references public.reunioes(id) on delete set null,
  risco_id               uuid references public.riscos(id) on delete set null,
  problema               text not null,
  decisao                text,
  responsavel_id         uuid references public.pessoas(id) on delete set null,
  prazo                  date,
  status                 text not null default 'pendente' check (status in ('pendente','tomada','implementada','cancelada')),
  data_decisao           date,
  resultado              text,
  -- bloco de origem
  fonte                  text not null default 'manual',
  id_externo             text,
  importado_em           timestamptz,
  atualizado_em_origem   timestamptz,
  hash_conteudo          text,
  status_sync            text not null default 'local' check (status_sync in ('local','sincronizado','pendente','conflito','erro')),
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now(),
  unique (fonte, id_externo),
  check (status <> 'tomada' or decisao is not null)
);
create index decisoes_pendentes_idx on public.decisoes (prazo) where status = 'pendente';
