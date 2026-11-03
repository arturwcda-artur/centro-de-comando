-- 0005 — Planejamento: versões de cronograma (MS Project é a fonte oficial), atividades, dependências, marcos, avanço físico

create table public.cronograma_versoes (
  id                   uuid primary key default gen_random_uuid(),
  obra_id              uuid not null references public.obras(id) on delete restrict,
  nome                 text not null,
  tipo                 text not null check (tipo in ('linha_base','vigente','reprogramacao','historico')),
  data_status          date,
  arquivo_origem       text,
  -- bloco de origem
  fonte                text not null default 'msproject',
  id_externo           text,
  importado_em         timestamptz,
  atualizado_em_origem timestamptz,
  hash_conteudo        text,
  status_sync          text not null default 'local' check (status_sync in ('local','sincronizado','pendente','conflito','erro')),
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),
  unique (fonte, id_externo)
);
-- No máximo uma versão vigente e uma linha de base por obra
create unique index cronograma_vigente_unico on public.cronograma_versoes (obra_id) where tipo = 'vigente';
create unique index cronograma_linha_base_unica on public.cronograma_versoes (obra_id) where tipo = 'linha_base';

create table public.atividades_cronograma (
  id                uuid primary key default gen_random_uuid(),
  versao_id         uuid not null references public.cronograma_versoes(id) on delete cascade,
  uid_project       integer not null,
  edt               text,
  nome              text not null,
  nivel             smallint not null default 1,
  resumo            boolean not null default false,
  marco             boolean not null default false,
  critica           boolean not null default false,
  duracao_dias      numeric(8,2),
  inicio_previsto   date,
  fim_previsto      date,
  inicio_real       date,
  fim_real          date,
  percentual        numeric(5,2) not null default 0 check (percentual between 0 and 100),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  unique (versao_id, uid_project)
);

create table public.dependencias (
  id               uuid primary key default gen_random_uuid(),
  atividade_id     uuid not null references public.atividades_cronograma(id) on delete cascade,
  predecessora_id  uuid not null references public.atividades_cronograma(id) on delete cascade,
  tipo             text not null default 'TI' check (tipo in ('TI','II','TT','IT')),
  defasagem_dias   numeric(8,2) not null default 0,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  unique (atividade_id, predecessora_id),
  check (atividade_id <> predecessora_id)
);
comment on column public.dependencias.tipo is 'TI=término-início, II=início-início, TT=término-término, IT=início-término.';

create table public.marcos (
  id               uuid primary key default gen_random_uuid(),
  obra_id          uuid not null references public.obras(id) on delete cascade,
  nome             text not null,
  contratual       boolean not null default false,
  data_contratual  date,
  data_prevista    date,
  data_real        date,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index marcos_obra_idx on public.marcos (obra_id, data_prevista);

create table public.avanco_fisico (
  id               uuid primary key default gen_random_uuid(),
  obra_id          uuid not null references public.obras(id) on delete cascade,
  data_referencia  date not null,
  previsto_acum    numeric(5,2) check (previsto_acum between 0 and 100),
  realizado_acum   numeric(5,2) check (realizado_acum between 0 and 100),
  fonte            text not null default 'manual',
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  unique (obra_id, data_referencia)
);
comment on table public.avanco_fisico is 'Série temporal da Curva S (percentuais acumulados).';
