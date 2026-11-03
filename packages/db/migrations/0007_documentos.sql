-- 0007 — Documentos: índice e referência (arquivos permanecem no Google Drive / pastas)

create table public.documentos (
  id                     uuid primary key default gen_random_uuid(),
  obra_id                uuid references public.obras(id) on delete set null,
  categoria              text not null default 'outro' check (categoria in (
                           'planejamento','orcamento_licitacao','contratos','aditivos_reequilibrios','medicoes',
                           'financeiro','compras_materiais','projetos_tecnicos','programacoes','atas_reunioes',
                           'oficios_requerimentos','juridicos','equipe_efetivo','diario_obra','terceirizados',
                           'revisar','outro')),
  titulo                 text not null,
  assunto                text,
  data_documento         date,
  caminho_local          text,
  drive_file_id          text,
  url                    text,
  mime_type              text,
  tamanho_bytes          bigint check (tamanho_bytes >= 0),
  texto_extraido         text,
  busca                  tsvector generated always as (
                           setweight(to_tsvector('portuguese', coalesce(titulo, '')), 'A') ||
                           setweight(to_tsvector('portuguese', coalesce(assunto, '')), 'B') ||
                           setweight(to_tsvector('portuguese', coalesce(texto_extraido, '')), 'C')
                         ) stored,
  -- bloco de origem
  fonte                  text not null default 'manual',
  id_externo             text,
  importado_em           timestamptz,
  atualizado_em_origem   timestamptz,
  hash_conteudo          text,
  status_sync            text not null default 'local' check (status_sync in ('local','sincronizado','pendente','conflito','erro')),
  arquivado_em           timestamptz,
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now(),
  unique (fonte, id_externo),
  check (num_nonnulls(caminho_local, drive_file_id, url) >= 1)
);
comment on column public.documentos.categoria is 'Taxonomia derivada da estrutura de pastas 01–15/99 das obras.';
create index documentos_busca_idx on public.documentos using gin (busca);
create index documentos_obra_idx on public.documentos (obra_id, categoria);

create table public.documento_versoes (
  id               uuid primary key default gen_random_uuid(),
  documento_id     uuid not null references public.documentos(id) on delete cascade,
  versao           integer not null check (versao > 0),
  drive_revision_id text,
  hash_conteudo    text,
  modificado_em    timestamptz,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  unique (documento_id, versao)
);

-- Vínculo de documentos a qualquer registro (tarefa, medição, aditivo, reunião...)
create table public.anexos (
  id             uuid primary key default gen_random_uuid(),
  entidade       text not null check (entidade in ('tarefas','medicoes','aditivos','contratos','reunioes','decisoes','riscos','eventos')),
  registro_id    uuid not null,
  documento_id   uuid not null references public.documentos(id) on delete cascade,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (entidade, registro_id, documento_id)
);
create index anexos_registro_idx on public.anexos (entidade, registro_id);
