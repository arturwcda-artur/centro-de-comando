-- 0019 — Leitura dos cronogramas do MS Project (ADR 0015, RN-65, RN-68)
-- O agente local lê os .mpp em modo somente leitura e grava por funções, com um papel restrito.

create table public.cronograma_arquivos (
  id                        uuid primary key default gen_random_uuid(),
  obra_id                   uuid not null references public.obras(id) on delete restrict,
  papel                     text not null check (papel in ('vigente','linha_base','historico')),
  caminho                   text not null,
  ultimo_hash               text,
  ultima_leitura_em         timestamptz,
  ultimo_erro               text,
  valor_executado_anterior  numeric(14,2) check (valor_executado_anterior >= 0),
  data_executado_anterior   date,
  criado_em                 timestamptz not null default now(),
  atualizado_em             timestamptz not null default now(),
  unique (obra_id, caminho),
  check (papel = 'vigente' or valor_executado_anterior is null)
);
comment on table public.cronograma_arquivos is 'Arquivos do MS Project acompanhados pelo agente local.';
comment on column public.cronograma_arquivos.valor_executado_anterior is 'Valor já executado antes do início deste cronograma. É o ponto de partida da Curva S vigente.';
create unique index cronograma_arquivo_vigente_unico on public.cronograma_arquivos (obra_id) where papel = 'vigente';
create unique index cronograma_arquivo_linha_base_unica on public.cronograma_arquivos (obra_id) where papel = 'linha_base';

select app.aplicar_padroes('public.cronograma_arquivos');

alter table public.atividades_cronograma add column custo numeric(14,2) check (custo >= 0);
alter table public.cronograma_versoes add column arquivo_id uuid references public.cronograma_arquivos(id) on delete restrict;
create index cronograma_versoes_arquivo_idx on public.cronograma_versoes (arquivo_id);

-- Realizado de cada versão: base dos pontos da Curva S
create view public.cronograma_realizado with (security_invoker = on) as
select v.id as versao_id,
       v.obra_id,
       v.arquivo_id,
       (v.importado_em at time zone 'America/Sao_Paulo')::date as data_leitura,
       coalesce(sum(a.custo) filter (where not a.resumo), 0) as total,
       coalesce(sum(a.custo * a.percentual / 100) filter (where not a.resumo), 0) as realizado
  from public.cronograma_versoes v
  join public.atividades_cronograma a on a.versao_id = v.id
 group by v.id;
revoke all on public.cronograma_realizado from anon;

-- Sem senha, o papel não entra. O proprietário ativa com "alter role ... login password".
create role agente_cronograma nologin noinherit;
grant usage on schema public to agente_cronograma;

create function public.listar_cronogramas_agente()
returns table (id uuid, caminho text, ultimo_hash text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.caminho, a.ultimo_hash from public.cronograma_arquivos a order by a.papel, a.caminho;
$$;

create function public.registrar_erro_cronograma(p_arquivo uuid, p_erro text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.cronograma_arquivos set ultimo_erro = left(p_erro, 500) where id = p_arquivo;
$$;

create function public.importar_cronograma(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_arquivo   public.cronograma_arquivos;
  v_existente public.cronograma_versoes;
  v_hash      text := payload->>'hash';
  v_id_ext    text;
  v_tipo      text;
  v_versao    uuid;
  v_marco     record;
begin
  select * into v_arquivo from public.cronograma_arquivos where id = (payload->>'arquivo_id')::uuid;
  if not found then
    raise exception 'Arquivo de cronograma não cadastrado';
  end if;
  v_id_ext := v_arquivo.id::text || ':' || v_hash;

  select * into v_existente from public.cronograma_versoes where fonte = 'msproject' and id_externo = v_id_ext;
  if found then
    -- O arquivo voltou a um conteúdo já lido: a versão guardada volta a valer
    if v_arquivo.papel = 'vigente' and v_existente.tipo <> 'vigente' then
      update public.cronograma_versoes set tipo = 'historico' where obra_id = v_arquivo.obra_id and tipo = 'vigente';
      update public.cronograma_versoes set tipo = 'vigente' where id = v_existente.id;
    end if;
    update public.cronograma_arquivos set ultimo_hash = v_hash, ultima_leitura_em = now(), ultimo_erro = null where id = v_arquivo.id;
    return 'igual';
  end if;

  v_tipo := v_arquivo.papel;
  if v_arquivo.papel = 'vigente' then
    update public.cronograma_versoes set tipo = 'historico' where obra_id = v_arquivo.obra_id and tipo = 'vigente';
  elsif v_arquivo.papel = 'linha_base'
    and exists (select 1 from public.cronograma_versoes where obra_id = v_arquivo.obra_id and tipo = 'linha_base') then
    v_tipo := 'reprogramacao'; -- a linha de base só muda por decisão do proprietário
  end if;

  insert into public.cronograma_versoes
    (obra_id, nome, tipo, arquivo_origem, arquivo_id, fonte, id_externo, importado_em, atualizado_em_origem, hash_conteudo, status_sync)
  values
    (v_arquivo.obra_id, coalesce(payload->>'nome', 'Cronograma'), v_tipo, v_arquivo.caminho, v_arquivo.id, 'msproject', v_id_ext, now(),
     (payload->>'atualizado_em_origem')::timestamptz, v_hash, 'sincronizado')
  returning id into v_versao;

  insert into public.atividades_cronograma
    (versao_id, uid_project, edt, nome, nivel, resumo, marco, critica, duracao_dias, inicio_previsto, fim_previsto, inicio_real, fim_real, percentual, custo)
  select v_versao, a.uid, a.edt, coalesce(nullif(a.nome, ''), '(sem nome)'), coalesce(a.nivel, 1), coalesce(a.resumo, false), coalesce(a.marco, false),
         coalesce(a.critica, false), a.duracao_dias, a.inicio_previsto, a.fim_previsto, a.inicio_real, a.fim_real, coalesce(a.percentual, 0), a.custo
    from jsonb_to_recordset(payload->'atividades') as a(
      uid integer, edt text, nome text, nivel smallint, resumo boolean, marco boolean, critica boolean, duracao_dias numeric,
      inicio_previsto date, fim_previsto date, inicio_real date, fim_real date, percentual numeric, custo numeric);

  insert into public.dependencias (atividade_id, predecessora_id, tipo, defasagem_dias)
  select sucessora.id, predecessora.id, d.tipo, coalesce(d.defasagem_dias, 0)
    from jsonb_to_recordset(coalesce(payload->'dependencias', '[]'::jsonb)) as d(uid integer, predecessora_uid integer, tipo text, defasagem_dias numeric)
    join public.atividades_cronograma sucessora on sucessora.versao_id = v_versao and sucessora.uid_project = d.uid
    join public.atividades_cronograma predecessora on predecessora.versao_id = v_versao and predecessora.uid_project = d.predecessora_uid
  on conflict do nothing;

  if v_arquivo.papel = 'vigente' then
    for v_marco in
      select nome, fim_previsto, fim_real, nome ilike '%limite contratual%' as contratual
        from public.atividades_cronograma where versao_id = v_versao and marco
    loop
      update public.marcos
         set data_prevista = v_marco.fim_previsto,
             data_real = v_marco.fim_real,
             contratual = v_marco.contratual,
             data_contratual = case when v_marco.contratual then v_marco.fim_previsto else data_contratual end
       where obra_id = v_arquivo.obra_id and nome = v_marco.nome;
      if not found then
        insert into public.marcos (obra_id, nome, contratual, data_contratual, data_prevista, data_real)
        values (v_arquivo.obra_id, v_marco.nome, v_marco.contratual, case when v_marco.contratual then v_marco.fim_previsto end, v_marco.fim_previsto, v_marco.fim_real);
      end if;
    end loop;
  end if;

  update public.cronograma_arquivos set ultimo_hash = v_hash, ultima_leitura_em = now(), ultimo_erro = null where id = v_arquivo.id;
  return 'criada';
end;
$$;

create function public.tornar_linha_base(p_versao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_obra uuid;
begin
  if not app.is_proprietario() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  select obra_id into v_obra from public.cronograma_versoes where id = p_versao and tipo = 'reprogramacao';
  if not found then
    raise exception 'Só uma reprogramação pode virar linha de base';
  end if;
  update public.cronograma_versoes set tipo = 'historico' where obra_id = v_obra and tipo = 'linha_base';
  update public.cronograma_versoes set tipo = 'linha_base' where id = p_versao;
end;
$$;

revoke all on function public.listar_cronogramas_agente() from public, anon, authenticated, service_role;
revoke all on function public.registrar_erro_cronograma(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.importar_cronograma(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.tornar_linha_base(uuid) from public, anon, service_role;
grant execute on function public.listar_cronogramas_agente() to agente_cronograma;
grant execute on function public.registrar_erro_cronograma(uuid, text) to agente_cronograma;
grant execute on function public.importar_cronograma(jsonb) to agente_cronograma;
grant execute on function public.tornar_linha_base(uuid) to authenticated;

-- Cadastro dos arquivos da obra piloto (decisão do proprietário em 04/11/2026). Só caminhos, sem dados do cronograma.
insert into public.cronograma_arquivos (obra_id, papel, caminho)
select o.id, a.papel, o.pasta_local || a.relativo
  from public.obras o
 cross join (values
   ('vigente',    '\17_Plano_de_Retomada\PLANO_RETOMADA_PRF_REV02.mpp'),
   ('linha_base', '\01_Planejamento_e_Cronograma\01-PLANEJAMENTO\planejamento valido\enviado-prf\PLANEJAMENTO-PRF-FINAL.mpp'),
   ('historico',  '\01_Planejamento_e_Cronograma\01-PLANEJAMENTO\planejamento valido\PLANEJAMENTO-PRF-FINAL.mpp'),
   ('historico',  '\01_Planejamento_e_Cronograma\01-PLANEJAMENTO\planejamento valido\PLANEJAMENTO-PRF--AVALIAÇÃO DE-EQUIPE.mpp')
 ) as a(papel, relativo)
 where o.codigo = 'PRF-RECANTO' and o.pasta_local is not null;
