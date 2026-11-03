-- 0004 — Contratos, aditivos, medições e lançamentos financeiros
-- Separação de valores (REGRAS_DE_NEGOCIO §2): contratado, medido, faturado, recebido.

create table public.contratos (
  id                     uuid primary key default gen_random_uuid(),
  obra_id                uuid not null references public.obras(id) on delete restrict,
  contratante_id         uuid references public.contratantes(id) on delete restrict,
  numero                 text not null,
  objeto                 text,
  modalidade             text,
  regime                 text,
  data_assinatura        date,
  data_inicio            date,
  prazo_original_dias    integer check (prazo_original_dias > 0),
  data_termino_original  date,
  valor_original         numeric(14,2) not null check (valor_original >= 0),
  indice_reajuste        text,
  data_base              date,
  arquivado_em           timestamptz,
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now(),
  unique (obra_id, numero)
);

create table public.aditivos (
  id             uuid primary key default gen_random_uuid(),
  contrato_id    uuid not null references public.contratos(id) on delete restrict,
  numero         text not null,
  tipo           text not null check (tipo in ('prazo','acrescimo','supressao','reajuste','reequilibrio','misto')),
  valor_delta    numeric(14,2) not null default 0,
  dias_delta     integer not null default 0,
  data_assinatura date,
  justificativa  text,
  situacao       text not null default 'em_analise' check (situacao in ('em_analise','aprovado','rejeitado')),
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (contrato_id, numero),
  check (tipo <> 'supressao' or valor_delta <= 0),
  check (tipo not in ('acrescimo','reajuste') or valor_delta >= 0),
  check (tipo <> 'prazo' or valor_delta = 0)
);
comment on column public.aditivos.valor_delta is 'Variação de valor com sinal: supressão é negativa.';

create table public.medicoes (
  id                     uuid primary key default gen_random_uuid(),
  contrato_id            uuid not null references public.contratos(id) on delete restrict,
  numero                 integer not null check (numero > 0),
  periodo_inicio         date not null,
  periodo_fim            date not null,
  valor_medido           numeric(14,2) not null check (valor_medido >= 0),
  valor_glosado          numeric(14,2) not null default 0 check (valor_glosado >= 0),
  percentual_fisico_acum numeric(5,2) check (percentual_fisico_acum between 0 and 100),
  situacao               text not null default 'elaborada' check (situacao in ('elaborada','enviada','aprovada','glosada','cancelada')),
  data_envio             date,
  data_aprovacao         date,
  -- bloco de origem
  fonte                  text not null default 'manual',
  id_externo             text,
  importado_em           timestamptz,
  atualizado_em_origem   timestamptz,
  hash_conteudo          text,
  status_sync            text not null default 'local' check (status_sync in ('local','sincronizado','pendente','conflito','erro')),
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now(),
  unique (contrato_id, numero),
  unique (fonte, id_externo),
  check (periodo_fim >= periodo_inicio),
  check (valor_glosado <= valor_medido)
);

create table public.lancamentos_financeiros (
  id             uuid primary key default gen_random_uuid(),
  contrato_id    uuid not null references public.contratos(id) on delete restrict,
  medicao_id     uuid references public.medicoes(id) on delete restrict,
  tipo           text not null check (tipo in ('faturamento','recebimento','previsao_recebimento','retencao')),
  valor          numeric(14,2) not null check (valor >= 0),
  data_prevista  date,
  data_efetiva   date,
  nota_fiscal    text,
  observacoes    text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  check (data_prevista is not null or data_efetiva is not null)
);
create index lancamentos_contrato_idx on public.lancamentos_financeiros (contrato_id, tipo);
