-- 0030 — Plano de ações da obra lido da Central de Gestão (planilha) pelo agente local (ADR 0022, RN-49f)
-- A planilha é a fonte: aqui as ações só são mostradas e priorizadas. Nada é gravado de volta na planilha.

create table public.acoes_planilhas (
  id                 uuid primary key default gen_random_uuid(),
  obra_id            uuid not null unique references public.obras(id) on delete restrict,
  caminho            text not null,
  ultimo_hash        text,
  ultima_leitura_em  timestamptz,
  ultimo_erro        text,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);
comment on table public.acoes_planilhas is 'Planilha da Central de Gestão (aba AÇÕES) acompanhada pelo agente local, uma por obra.';

select app.aplicar_padroes('public.acoes_planilhas');

-- Notas GUT e 5W2H de cada ação, separados, para a Matriz GUT. "Quando" é o prazo da tarefa.
create table public.acoes_detalhes (
  tarefa_id      uuid primary key references public.tarefas(id) on delete cascade,
  gravidade      smallint check (gravidade between 1 and 5),
  urgencia       smallint check (urgencia between 1 and 5),
  tendencia      smallint check (tendencia between 1 and 5),
  gut            smallint generated always as (gravidade * urgencia * tendencia) stored,
  o_que          text,
  por_que        text,
  onde           text,
  quem           text,
  como           text,
  quanto         text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
comment on table public.acoes_detalhes is 'Notas GUT e 5W2H das ações lidas da planilha. Só leitura no sistema: a fonte é a planilha.';
create index acoes_detalhes_gut_idx on public.acoes_detalhes (gut desc nulls last);

select app.aplicar_padroes('public.acoes_detalhes', false);

create function public.listar_acoes_agente()
returns table (id uuid, caminho text, ultimo_hash text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.caminho, a.ultimo_hash from public.acoes_planilhas a order by a.caminho;
$$;

create function public.registrar_erro_acoes(p_arquivo uuid, p_erro text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.acoes_planilhas set ultimo_erro = left(p_erro, 500) where id = p_arquivo;
$$;

-- Pessoa pelo primeiro nome da planilha ("Eng. Adamo (obra)" chega como "adamo"). Só vale com uma única pessoa correspondente.
create function app.pessoa_pela_chave(p_chave text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select (array_agg(p.id))[1]
    from public.pessoas p
   where p.arquivado_em is null
     and coalesce(p_chave, '') <> ''
     and lower(translate(p.nome, 'ÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç', 'AAAAEEIOOOUCaaaaeeiooouc')) like p_chave || '%'
  having count(*) = 1;
$$;

create function public.importar_acoes(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_arquivo   public.acoes_planilhas;
  v_pessoa    uuid;
  v_status    text;
  v_concluida timestamptz;
  v_novo      boolean;
  v_novas     integer := 0;
  v_alteradas integer := 0;
  v_ausentes  integer := 0;
  v_numeros   text[];
  a           jsonb;
begin
  select * into v_arquivo from public.acoes_planilhas where id = (payload->>'arquivo_id')::uuid;
  if not found then
    raise exception 'Planilha de ações não cadastrada';
  end if;

  for a in select * from jsonb_array_elements(payload->'acoes') loop
    v_pessoa := app.pessoa_pela_chave(a->>'responsavel_chave');
    v_status := a->>'status';
    -- "Aguardando terceiro" exige a pessoa; sem ela, a ação segue em andamento
    if v_status = 'aguardando_terceiro' and v_pessoa is null then
      v_status := 'em_andamento';
    end if;
    v_concluida := case when v_status = 'concluida' then coalesce((a->>'concluida_em')::date::timestamptz, now()) end;

    insert into public.tarefas as t
      (titulo, descricao, obra_id, responsavel_id, aguardando_pessoa_id, tipo, categoria, prazo, importancia, impacto, critica,
       status, concluida_em, fonte, id_externo, importado_em, hash_conteudo, status_sync)
    values
      (a->>'titulo', a->>'descricao', v_arquivo.obra_id,
       case when v_status = 'aguardando_terceiro' then null else v_pessoa end,
       case when v_status = 'aguardando_terceiro' then v_pessoa end,
       a->>'tipo', a->>'categoria', (a->>'prazo')::date,
       (a->>'importancia')::smallint, (a->>'impacto')::smallint, (a->>'critica')::boolean,
       v_status, v_concluida, 'planilha', v_arquivo.obra_id::text || ':' || (a->>'numero'), now(), a->>'hash', 'sincronizado')
    on conflict (fonte, id_externo) do update
      set titulo = excluded.titulo, descricao = excluded.descricao, responsavel_id = excluded.responsavel_id,
          aguardando_pessoa_id = excluded.aguardando_pessoa_id, tipo = excluded.tipo, categoria = excluded.categoria,
          prazo = excluded.prazo, importancia = excluded.importancia, impacto = excluded.impacto, critica = excluded.critica,
          status = excluded.status, concluida_em = excluded.concluida_em, importado_em = now(),
          hash_conteudo = excluded.hash_conteudo, status_sync = 'sincronizado'
      where (t.hash_conteudo, t.responsavel_id, t.aguardando_pessoa_id, t.status_sync)
            is distinct from (excluded.hash_conteudo, excluded.responsavel_id, excluded.aguardando_pessoa_id, 'sincronizado')
    returning (xmax = 0) into v_novo;

    if found then
      if v_novo then v_novas := v_novas + 1; else v_alteradas := v_alteradas + 1; end if;
    end if;
  end loop;

  select array_agg(v_arquivo.obra_id::text || ':' || (x->>'numero')) into v_numeros from jsonb_array_elements(payload->'acoes') x;

  -- Ação que saiu da planilha não é apagada: fica marcada para conferência (RN-49f)
  update public.tarefas
     set status_sync = 'pendente'
   where fonte = 'planilha' and obra_id = v_arquivo.obra_id
     and not (id_externo = any (coalesce(v_numeros, '{}')))
     and status_sync <> 'pendente';
  get diagnostics v_ausentes = row_count;

  -- Notas e 5W2H separados (Matriz GUT)
  insert into public.acoes_detalhes as d (tarefa_id, gravidade, urgencia, tendencia, o_que, por_que, onde, quem, como, quanto)
  select t.id, (x->'gut'->>'gravidade')::smallint, (x->'gut'->>'urgencia')::smallint, (x->'gut'->>'tendencia')::smallint,
         nullif(x->'w5h2'->>'o_que', ''), nullif(x->'w5h2'->>'por_que', ''), nullif(x->'w5h2'->>'onde', ''),
         nullif(x->'w5h2'->>'quem', ''), nullif(x->'w5h2'->>'como', ''), nullif(x->'w5h2'->>'quanto', '')
    from jsonb_array_elements(payload->'acoes') x
    join public.tarefas t on t.fonte = 'planilha' and t.id_externo = v_arquivo.obra_id::text || ':' || (x->>'numero')
  on conflict (tarefa_id) do update
    set gravidade = excluded.gravidade, urgencia = excluded.urgencia, tendencia = excluded.tendencia, o_que = excluded.o_que,
        por_que = excluded.por_que, onde = excluded.onde, quem = excluded.quem, como = excluded.como, quanto = excluded.quanto
    where (d.gravidade, d.urgencia, d.tendencia, d.o_que, d.por_que, d.onde, d.quem, d.como, d.quanto)
          is distinct from (excluded.gravidade, excluded.urgencia, excluded.tendencia, excluded.o_que, excluded.por_que, excluded.onde, excluded.quem, excluded.como, excluded.quanto);

  -- Dependências refeitas a partir da coluna "Depende das ações Nº"
  delete from public.tarefa_dependencias d
   using public.tarefas t
   where d.tarefa_id = t.id and t.fonte = 'planilha' and t.obra_id = v_arquivo.obra_id;
  insert into public.tarefa_dependencias (tarefa_id, depende_de_id)
  select distinct t.id, p.id
    from jsonb_array_elements(payload->'acoes') x
    cross join lateral jsonb_array_elements_text(coalesce(x->'depende', '[]'::jsonb)) as dep(numero)
    join public.tarefas t on t.fonte = 'planilha' and t.id_externo = v_arquivo.obra_id::text || ':' || (x->>'numero')
    join public.tarefas p on p.fonte = 'planilha' and p.id_externo = v_arquivo.obra_id::text || ':' || dep.numero
   where t.id <> p.id;

  update public.acoes_planilhas set ultimo_hash = payload->>'hash', ultima_leitura_em = now(), ultimo_erro = null where id = v_arquivo.id;
  return format('%s novas, %s alteradas, %s fora da planilha', v_novas, v_alteradas, v_ausentes);
end;
$$;

revoke all on function public.listar_acoes_agente() from public, anon, authenticated, service_role;
revoke all on function public.registrar_erro_acoes(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.importar_acoes(jsonb) from public, anon, authenticated, service_role;
revoke all on function app.pessoa_pela_chave(text) from public, anon, authenticated, service_role;
grant execute on function public.listar_acoes_agente() to agente_cronograma;
grant execute on function public.registrar_erro_acoes(uuid, text) to agente_cronograma;
grant execute on function public.importar_acoes(jsonb) to agente_cronograma;
