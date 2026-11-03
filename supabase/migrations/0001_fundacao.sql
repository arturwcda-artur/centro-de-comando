-- 0001 — Fundação: proprietário único, utilitários e auditoria
-- Convenções: ver docs/DATABASE.md. Datas em timestamptz; exibição em America/Sao_Paulo.

create schema if not exists app;
comment on schema app is 'Objetos internos (não expostos pela API REST).';

-- Proprietário único do sistema. RLS libera acesso apenas a este usuário.
create table app.proprietario (
  id         boolean primary key default true check (id),  -- garante no máximo 1 linha
  user_id    uuid not null unique,
  definido_em timestamptz not null default now()
);
comment on table app.proprietario is 'Usuário (auth.users.id) dono do sistema. Linha única.';

create or replace function app.is_proprietario()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from app.proprietario p where p.user_id = auth.uid()
  );
$$;
comment on function app.is_proprietario() is 'Verdadeiro se o usuário autenticado é o proprietário. Base de todas as políticas RLS.';

-- Mantém atualizado_em
create or replace function app.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- Hoje no fuso oficial do sistema
create or replace function app.hoje()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- Auditoria genérica (antes/depois) das tabelas de negócio
create table app.auditoria (
  id           bigint generated always as identity primary key,
  tabela       text        not null,
  registro_id  uuid,
  operacao     text        not null check (operacao in ('INSERT','UPDATE','DELETE')),
  antes        jsonb,
  depois       jsonb,
  usuario_id   uuid,
  papel        text        not null default current_user,
  ocorrido_em  timestamptz not null default now()
);
create index auditoria_registro_idx on app.auditoria (tabela, registro_id, ocorrido_em desc);

create or replace function app.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into app.auditoria (tabela, registro_id, operacao, antes, depois, usuario_id)
  values (
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', null)::uuid,
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

grant usage on schema app to authenticated, service_role;
grant execute on function app.is_proprietario() to authenticated, service_role;
grant execute on function app.hoje() to authenticated, service_role;
grant select on app.auditoria to service_role;
revoke all on schema app from anon;
