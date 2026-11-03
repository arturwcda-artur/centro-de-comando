-- 0003 — Obras e participantes
-- Valores e avanços NÃO são gravados aqui: são calculados nas views (0010).

create table public.obras (
  id                       uuid primary key default gen_random_uuid(),
  codigo                   text not null unique,
  nome                     text not null,
  empresa_id               uuid references public.empresas(id) on delete restrict,
  contratante_id           uuid references public.contratantes(id) on delete restrict,
  endereco                 text,
  cidade                   text,
  uf                       char(2),
  situacao                 text not null default 'planejamento'
                           check (situacao in ('planejamento','andamento','paralisada','aguardando','concluida','cancelada')),
  data_inicio              date,
  data_termino_prevista    date,
  pasta_local              text,
  drive_folder_id          text,
  observacoes              text,
  arquivado_em             timestamptz,
  criado_em                timestamptz not null default now(),
  atualizado_em            timestamptz not null default now()
);
comment on column public.obras.data_termino_prevista is 'Previsão gerencial de término (pode diferir do prazo contratual vigente).';
comment on column public.obras.pasta_local is 'Caminho da pasta da obra no PC (referência, não cópia).';
create index obras_situacao_idx on public.obras (situacao) where arquivado_em is null;

create table public.obra_participantes (
  id             uuid primary key default gen_random_uuid(),
  obra_id        uuid not null references public.obras(id) on delete cascade,
  pessoa_id      uuid references public.pessoas(id) on delete restrict,
  fornecedor_id  uuid references public.fornecedores(id) on delete restrict,
  papel          text not null,
  inicio         date,
  fim            date,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  check (num_nonnulls(pessoa_id, fornecedor_id) = 1),
  check (fim is null or inicio is null or fim >= inicio)
);
create index obra_participantes_obra_idx on public.obra_participantes (obra_id);
