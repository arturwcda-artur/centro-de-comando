-- 0016 — Remove do banco as cópias de cartões de listas de credenciais do Trello (RN-66)
-- A primeira sincronização importou a lista "Senhas apps". Autorizado pelo proprietário em 04/11/2026.
-- Só afeta o banco do Centro de Comando: os cartões continuam intactos no Trello.
--
-- ÚNICA exceção à imutabilidade de app.auditoria: as linhas removidas guardavam cópia do conteúdo.
-- O conteúdo não é lido nem registrado aqui; fica só o registro de que a remoção aconteceu.

do $$
declare
  ids uuid[];
begin
  select coalesce(array_agg(id), '{}') into ids
  from public.tarefas
  where fonte = 'trello' and categoria ilike '%senha%';

  -- Sem o trigger, o DELETE não gera uma nova cópia do conteúdo na auditoria
  alter table public.tarefas disable trigger tg_auditoria;
  delete from public.tarefas where id = any (ids);
  alter table public.tarefas enable trigger tg_auditoria;

  alter table app.auditoria disable trigger tg_auditoria_imutavel;
  delete from app.auditoria where tabela = 'tarefas' and registro_id = any (ids);
  alter table app.auditoria enable trigger tg_auditoria_imutavel;

  if cardinality(ids) > 0 then
    insert into app.auditoria (tabela, operacao, depois)
    values ('tarefas', 'DELETE', jsonb_build_object(
      'motivo', 'Remoção de cópias de lista de credenciais do Trello (migration 0016, RN-66)',
      'quantidade', cardinality(ids)));
  end if;

  if exists (select 1 from public.tarefas where fonte = 'trello' and categoria ilike '%senha%') then
    raise exception 'Remoção incompleta: ainda há cópias de listas de credenciais';
  end if;
end;
$$;
