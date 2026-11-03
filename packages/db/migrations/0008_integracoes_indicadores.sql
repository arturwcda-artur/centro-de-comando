-- 0008 — Conectores, sincronizações, conflitos e fotografias de indicadores

create table public.conectores (
  id                    uuid primary key default gen_random_uuid(),
  ferramenta            text not null unique check (ferramenta in (
                          'trello','google_agenda','google_drive','notion','excel','msproject','github','gmail','todoist')),
  nome_exibicao         text not null,
  ativo                 boolean not null default false,
  pausado_ate           timestamptz,
  modo                  text not null default 'leitura' check (modo in ('leitura','leitura_escrita')),
  escrita_autorizada_em timestamptz,
  estado_conexao        text not null default 'nao_configurado'
                        check (estado_conexao in ('nao_configurado','conectado','erro_autenticacao','erro','pausado')),
  configuracao          jsonb not null default '{}'::jsonb,
  credencial_ref        text,
  intervalo_minutos     integer not null default 60 check (intervalo_minutos >= 5),
  ultima_sync_em        timestamptz,
  proxima_sync_em       timestamptz,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  check (modo = 'leitura' or escrita_autorizada_em is not null)
);
comment on column public.conectores.credencial_ref is 'Nome do segredo no Supabase Vault. O token em si nunca fica nesta tabela.';
comment on column public.conectores.escrita_autorizada_em is 'Gravação externa só é possível após autorização explícita do proprietário.';

create table public.sync_execucoes (
  id             uuid primary key default gen_random_uuid(),
  conector_id    uuid not null references public.conectores(id) on delete cascade,
  gatilho        text not null check (gatilho in ('agendado','manual','webhook')),
  iniciado_em    timestamptz not null default now(),
  finalizado_em  timestamptz,
  status         text not null default 'executando' check (status in ('executando','sucesso','parcial','erro')),
  lidos          integer not null default 0,
  criados        integer not null default 0,
  atualizados    integer not null default 0,
  ignorados      integer not null default 0,
  conflitos      integer not null default 0,
  erros          integer not null default 0,
  mensagem       text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index sync_execucoes_conector_idx on public.sync_execucoes (conector_id, iniciado_em desc);

create table public.sync_itens (
  id             bigint generated always as identity primary key,
  execucao_id    uuid not null references public.sync_execucoes(id) on delete cascade,
  entidade       text not null,
  id_externo     text not null,
  registro_id    uuid,
  acao           text not null check (acao in ('criado','atualizado','ignorado','conflito','erro')),
  hash_conteudo  text,
  erro           text,
  criado_em      timestamptz not null default now()
);
create index sync_itens_execucao_idx on public.sync_itens (execucao_id);
create index sync_itens_externo_idx on public.sync_itens (entidade, id_externo);

create table public.sync_conflitos (
  id             uuid primary key default gen_random_uuid(),
  conector_id    uuid not null references public.conectores(id) on delete cascade,
  entidade       text not null,
  registro_id    uuid not null,
  id_externo     text,
  valor_local    jsonb not null,
  valor_externo  jsonb not null,
  detectado_em   timestamptz not null default now(),
  resolucao      text check (resolucao in ('manter_local','aceitar_externo','mesclar')),
  resolvido_em   timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  check ((resolucao is null) = (resolvido_em is null))
);
create index sync_conflitos_abertos_idx on public.sync_conflitos (detectado_em) where resolvido_em is null;

create table public.indicadores_snapshot (
  id                    uuid primary key default gen_random_uuid(),
  obra_id               uuid not null references public.obras(id) on delete cascade,
  data_referencia       date not null,
  pct_fisico_previsto   numeric(5,2),
  pct_fisico_realizado  numeric(5,2),
  valor_contratado      numeric(14,2),
  valor_medido          numeric(14,2),
  valor_recebido        numeric(14,2),
  dias_alem_do_prazo    integer,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  unique (obra_id, data_referencia)
);
comment on table public.indicadores_snapshot is 'Fotografia periódica dos indicadores, para histórico e tendência.';
