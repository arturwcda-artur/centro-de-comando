-- 0020 — Medições item por item, lidas da planilha pelo agente local (ADR 0016, RN-22 a RN-24)
-- A planilha nunca altera uma medição já enviada: quem decide a situação é o proprietário.

create table public.medicao_arquivos (
  id                 uuid primary key default gen_random_uuid(),
  contrato_id        uuid not null unique references public.contratos(id) on delete restrict,
  modelo             text not null default 'mascara_medicoes' check (modelo in ('mascara_medicoes')),
  caminho            text not null,
  ultimo_hash        text,
  ultima_leitura_em  timestamptz,
  ultimo_erro        text,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);
comment on table public.medicao_arquivos is 'Planilha de medições acompanhada pelo agente local, uma por contrato.';

create table public.contrato_itens (
  id              uuid primary key default gen_random_uuid(),
  contrato_id     uuid not null references public.contratos(id) on delete restrict,
  item            text not null,
  descricao       text not null,
  unidade         text,
  quantidade      numeric(14,4) not null default 0,
  preco_unitario  numeric(18,6) not null default 0,
  valor_total     numeric(14,2) not null default 0,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (contrato_id, item)
);
comment on table public.contrato_itens is 'Serviços do contrato, vindos da planilha de medição. Item que some da planilha não é apagado.';

create table public.medicao_itens (
  id             uuid primary key default gen_random_uuid(),
  medicao_id     uuid not null references public.medicoes(id) on delete cascade,
  item_id        uuid not null references public.contrato_itens(id) on delete restrict,
  quantidade     numeric(14,4) not null,
  valor          numeric(14,2) not null,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  unique (medicao_id, item_id)
);
create index medicao_itens_item_idx on public.medicao_itens (item_id);

select app.aplicar_padroes('public.medicao_arquivos');
select app.aplicar_padroes('public.contrato_itens');
select app.aplicar_padroes('public.medicao_itens');

alter table public.medicoes add column data_medicao date;
alter table public.medicoes add column diferenca_planilha numeric(14,2);
comment on column public.medicoes.diferenca_planilha is 'Valor da planilha menos o valor gravado, quando a planilha mudou depois do envio da medição.';

-- Saldo por serviço: conta toda medição não cancelada, porque serve para preparar a próxima
create view public.v_contrato_itens_saldo with (security_invoker = on) as
select i.id as item_id,
       i.contrato_id,
       i.item,
       i.descricao,
       i.unidade,
       i.quantidade,
       i.preco_unitario,
       i.valor_total,
       coalesce(sum(mi.quantidade), 0) as quantidade_medida,
       coalesce(sum(mi.valor), 0) as valor_medido,
       i.quantidade - coalesce(sum(mi.quantidade), 0) as quantidade_saldo,
       i.valor_total - coalesce(sum(mi.valor), 0) as valor_saldo,
       coalesce(sum(mi.quantidade), 0) > i.quantidade + 0.0001 as acima_do_contrato
  from public.contrato_itens i
  left join (public.medicao_itens mi
             join public.medicoes m on m.id = mi.medicao_id and m.situacao <> 'cancelada')
         on mi.item_id = i.id
 group by i.id;
revoke all on public.v_contrato_itens_saldo from anon;

create function public.listar_medicoes_agente()
returns table (id uuid, caminho text, modelo text, ultimo_hash text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.caminho, a.modelo, a.ultimo_hash from public.medicao_arquivos a order by a.caminho;
$$;

create function public.registrar_erro_medicao(p_arquivo uuid, p_erro text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.medicao_arquivos set ultimo_erro = left(p_erro, 500) where id = p_arquivo;
$$;

create function public.importar_medicoes(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_arquivo public.medicao_arquivos;
  v_atual   public.medicoes;
  v_id      uuid;
  v_novo    numeric(14,2);
  m         jsonb;
begin
  select * into v_arquivo from public.medicao_arquivos where id = (payload->>'arquivo_id')::uuid;
  if not found then
    raise exception 'Planilha de medição não cadastrada';
  end if;

  insert into public.contrato_itens (contrato_id, item, descricao, unidade, quantidade, preco_unitario, valor_total)
  select v_arquivo.contrato_id, i.item, i.descricao, i.unidade, coalesce(i.quantidade, 0), coalesce(i.preco_unitario, 0), coalesce(i.valor_total, 0)
    from jsonb_to_recordset(payload->'itens') as i(item text, descricao text, unidade text, quantidade numeric, preco_unitario numeric, valor_total numeric)
  on conflict (contrato_id, item) do update
    set descricao = excluded.descricao, unidade = excluded.unidade, quantidade = excluded.quantidade,
        preco_unitario = excluded.preco_unitario, valor_total = excluded.valor_total
    where (contrato_itens.descricao, contrato_itens.unidade, contrato_itens.quantidade, contrato_itens.preco_unitario, contrato_itens.valor_total)
      is distinct from (excluded.descricao, excluded.unidade, excluded.quantidade, excluded.preco_unitario, excluded.valor_total);

  for m in select * from jsonb_array_elements(payload->'medicoes') loop
    v_novo := (m->>'valor_bruto')::numeric;
    select * into v_atual from public.medicoes where contrato_id = v_arquivo.contrato_id and numero = (m->>'numero')::integer;

    if found and v_atual.situacao = 'cancelada' then
      continue;
    end if;
    if found and v_atual.situacao <> 'elaborada' then
      update public.medicoes set diferenca_planilha = nullif(v_novo - valor_medido, 0)
       where id = v_atual.id and diferenca_planilha is distinct from nullif(v_novo - valor_medido, 0);
      continue;
    end if;

    if found then
      v_id := v_atual.id;
      if (v_atual.valor_medido, v_atual.periodo_inicio, v_atual.periodo_fim, v_atual.data_medicao, v_atual.hash_conteudo)
         is not distinct from (v_novo, (m->>'periodo_inicio')::date, (m->>'periodo_fim')::date, (m->>'data')::date, m->>'hash') then
        continue;
      end if;
      update public.medicoes
         set valor_medido = v_novo, periodo_inicio = (m->>'periodo_inicio')::date, periodo_fim = (m->>'periodo_fim')::date,
             data_medicao = (m->>'data')::date, hash_conteudo = m->>'hash', diferenca_planilha = null, status_sync = 'sincronizado'
       where id = v_id;
      delete from public.medicao_itens where medicao_id = v_id;
    else
      insert into public.medicoes
        (contrato_id, numero, periodo_inicio, periodo_fim, data_medicao, valor_medido, situacao, fonte, id_externo, importado_em, hash_conteudo, status_sync)
      values
        (v_arquivo.contrato_id, (m->>'numero')::integer, (m->>'periodo_inicio')::date, (m->>'periodo_fim')::date, (m->>'data')::date, v_novo,
         'elaborada', 'planilha', v_arquivo.contrato_id::text || ':' || (m->>'numero'), now(), m->>'hash', 'sincronizado')
      returning id into v_id;
    end if;

    insert into public.medicao_itens (medicao_id, item_id, quantidade, valor)
    select v_id, c.id, i.quantidade, i.valor
      from jsonb_to_recordset(m->'itens') as i(item text, quantidade numeric, valor numeric)
      join public.contrato_itens c on c.contrato_id = v_arquivo.contrato_id and c.item = i.item;
  end loop;

  update public.medicao_arquivos set ultimo_hash = payload->>'hash', ultima_leitura_em = now(), ultimo_erro = null where id = v_arquivo.id;
  return 'ok';
end;
$$;

revoke all on function public.listar_medicoes_agente() from public, anon, authenticated, service_role;
revoke all on function public.registrar_erro_medicao(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.importar_medicoes(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.listar_medicoes_agente() to agente_cronograma;
grant execute on function public.registrar_erro_medicao(uuid, text) to agente_cronograma;
grant execute on function public.importar_medicoes(jsonb) to agente_cronograma;
