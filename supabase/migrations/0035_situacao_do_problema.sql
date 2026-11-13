-- 0035 — Situação do problema acompanha as ações, inclusive as que viraram cartão no Trello (RN-49h, RN-49k)
-- A sincronização do Trello muda a situação das ações sem passar pela aplicação. Esta regra, no banco,
-- faz o problema andar sozinho: todas as ações válidas concluídas → resolvido; alguma aberta → resolvendo.
-- Mesma regra de situacaoPelasAcoes (apps/web/src/lib/problemas.ts).

create function app.situacao_do_problema()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atual  text;
  v_validas int;
  v_feitas int;
  v_nova   text;
begin
  if new.problema_id is null or new.status is not distinct from old.status then
    return new;
  end if;
  select status into v_atual from public.problemas where id = new.problema_id for update;
  if v_atual is null or v_atual = 'cancelado' then
    return new;
  end if;
  select count(*) filter (where status <> 'cancelada'), count(*) filter (where status = 'concluida')
    into v_validas, v_feitas
    from public.tarefas where problema_id = new.problema_id;
  if v_validas = 0 then
    v_nova := case when v_atual = 'resolvido' then 'em_andamento' else v_atual end;
  elsif v_feitas = v_validas then
    v_nova := 'resolvido';
  else
    v_nova := 'em_andamento';
  end if;
  if v_nova <> v_atual then
    update public.problemas
       set status = v_nova,
           resolvido_em = case when v_nova = 'resolvido' then now() end
     where id = new.problema_id;
  end if;
  return new;
end;
$$;

create trigger tg_tarefas_situacao_do_problema
  after update of status on public.tarefas
  for each row execute function app.situacao_do_problema();

revoke all on function app.situacao_do_problema() from public, anon, authenticated;
