-- 0009 — Padrões de segurança aplicados a TODA tabela de public:
--   RLS ativo, acesso só do proprietário, anon sem privilégios, atualizado_em automático, auditoria.
-- Novas tabelas em migrations futuras DEVEM chamar app.aplicar_padroes('public.<tabela>').

create or replace function app.aplicar_padroes(tabela regclass, auditar boolean default true)
returns void
language plpgsql
as $$
declare
  nome text := (select relname from pg_class where oid = tabela);
begin
  execute format('alter table %s enable row level security', tabela);
  execute format('alter table %s force row level security', tabela);
  execute format('revoke all on %s from anon', tabela);
  execute format('drop policy if exists proprietario_total on %s', tabela);
  execute format(
    'create policy proprietario_total on %s for all to authenticated
       using ((select app.is_proprietario())) with check ((select app.is_proprietario()))',
    tabela);

  if exists (select 1 from pg_attribute where attrelid = tabela and attname = 'atualizado_em' and not attisdropped) then
    execute format('drop trigger if exists tg_tocar_atualizado_em on %s', tabela);
    execute format(
      'create trigger tg_tocar_atualizado_em before update on %s
         for each row execute function app.tocar_atualizado_em()', tabela);
  end if;

  if auditar then
    execute format('drop trigger if exists tg_auditoria on %s', tabela);
    execute format(
      'create trigger tg_auditoria after insert or update or delete on %s
         for each row execute function app.registrar_auditoria()', tabela);
  end if;
end;
$$;

do $$
declare
  t record;
begin
  for t in
    select c.oid::regclass as tabela, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    -- Registros de sincronização são volumosos e já são, eles próprios, trilha de auditoria
    perform app.aplicar_padroes(t.tabela, t.relname not in ('sync_itens','sync_execucoes'));
  end loop;
end;
$$;

revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
