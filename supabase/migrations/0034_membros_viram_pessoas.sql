-- 0034 — Equipe do Trello como pessoas cadastradas (pedido do proprietário em 13/11/2026)
-- Assim os membros aparecem como responsáveis nos problemas e nas tarefas. Cada membro fica ligado a
-- uma pessoa: a que já existe com o mesmo primeiro e último nome, ou uma nova, criada sozinha.

alter table public.trello_membros add column pessoa_id uuid references public.pessoas(id) on delete set null;
comment on column public.trello_membros.pessoa_id is 'Pessoa cadastrada que corresponde a este membro do Trello.';

create function app.nome_normalizado(p_nome text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select regexp_split_to_array(lower(trim(translate(coalesce(p_nome, ''), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'))), '\s+');
$$;

create function app.ligar_membro_a_pessoa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partes text[] := app.nome_normalizado(new.nome);
  v_pessoa uuid;
begin
  if new.pessoa_id is not null or coalesce(new.nome, '') = '' then
    return new;
  end if;
  -- A sincronização grava com upsert: o membro que já existe mantém a sua pessoa, sem criar outra
  select m.pessoa_id into v_pessoa from public.trello_membros m where m.id_externo = new.id_externo and m.pessoa_id is not null;
  if v_pessoa is not null then
    new.pessoa_id := v_pessoa;
    return new;
  end if;
  -- Mesma pessoa: mesmo primeiro e último nome, e só uma correspondência
  select (array_agg(p.id))[1] into v_pessoa
    from public.pessoas p
   where p.arquivado_em is null
     and (app.nome_normalizado(p.nome))[1] = v_partes[1]
     and (app.nome_normalizado(p.nome))[array_length(app.nome_normalizado(p.nome), 1)] = v_partes[array_length(v_partes, 1)]
  having count(*) = 1;
  if v_pessoa is null then
    insert into public.pessoas (nome, funcao) values (new.nome, 'Equipe do Trello') returning id into v_pessoa;
  end if;
  new.pessoa_id := v_pessoa;
  return new;
end;
$$;

create trigger tg_trello_membros_pessoa
  before insert or update on public.trello_membros
  for each row execute function app.ligar_membro_a_pessoa();

revoke all on function app.nome_normalizado(text) from public, anon, authenticated;
revoke all on function app.ligar_membro_a_pessoa() from public, anon, authenticated;

-- Membros que já existem
update public.trello_membros set pessoa_id = null where pessoa_id is null;
