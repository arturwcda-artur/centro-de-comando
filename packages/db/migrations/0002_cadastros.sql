-- 0002 — Cadastros básicos: empresas, contratantes, pessoas, fornecedores

create table public.empresas (
  id             uuid primary key default gen_random_uuid(),
  razao_social   text not null,
  nome_fantasia  text,
  cnpj           text unique check (cnpj is null or cnpj ~ '^\d{14}$'),
  observacoes    text,
  arquivado_em   timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
comment on table public.empresas is 'Empresas pelas quais o gestor atua (executoras). Ex.: construtora contratada.';
comment on column public.empresas.cnpj is 'Somente dígitos (14).';

create table public.contratantes (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  tipo           text not null default 'publico' check (tipo in ('publico','privado')),
  orgao          text,
  cnpj           text unique check (cnpj is null or cnpj ~ '^\d{14}$'),
  observacoes    text,
  arquivado_em   timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
comment on table public.contratantes is 'Clientes/órgãos que contratam as obras.';

create table public.pessoas (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  funcao         text,
  empresa_id     uuid references public.empresas(id) on delete set null,
  email          text,
  telefone       text,
  eh_usuario     boolean not null default false,
  observacoes    text,
  arquivado_em   timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index pessoas_empresa_idx on public.pessoas (empresa_id);

create table public.fornecedores (
  id             uuid primary key default gen_random_uuid(),
  razao_social   text not null,
  nome_fantasia  text,
  cnpj           text unique check (cnpj is null or cnpj ~ '^\d{14}$'),
  especialidade  text,
  contato        text,
  avaliacao      smallint check (avaliacao between 1 and 5),
  observacoes    text,
  arquivado_em   timestamptz,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
