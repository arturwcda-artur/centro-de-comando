-- 0023 — Índice de documentos das obras e link do Drive (ADR 0018, RN-70 a RN-72)
-- Os arquivos não são copiados nem alterados. O agente envia nome, pasta e texto para a busca.

create table public.documento_pastas (
  id                 uuid primary key default gen_random_uuid(),
  obra_id            uuid not null unique references public.obras(id) on delete restrict,
  caminho            text not null,
  ultima_leitura_em  timestamptz,
  ultimo_erro        text,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);
comment on table public.documento_pastas is 'Pasta de cada obra acompanhada pelo agente local.';

-- Separado de documentos: gravar o link ali copiaria o texto inteiro para a auditoria
create table public.documento_links (
  documento_id   uuid primary key references public.documentos(id) on delete cascade,
  drive_file_id  text not null,
  url            text not null,
  atualizado_em  timestamptz not null default now()
);
comment on table public.documento_links is 'Link de cada documento no Google Drive, ligado pelo caminho na sincronização.';

select app.aplicar_padroes('public.documento_pastas');
select app.aplicar_padroes('public.documento_links', false);

alter table public.documentos add column pasta text;
alter table public.documentos add column obsoleto boolean not null default false;
alter table public.documentos add column sem_texto boolean not null default false;
comment on column public.documentos.sem_texto is 'PDF digitalizado: entra na busca só pelo nome.';

create function public.listar_pastas_agente()
returns table (id uuid, caminho text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.caminho from public.documento_pastas p order by p.caminho;
$$;

create function public.listar_documentos_agente(p_pasta uuid)
returns table (relativo text, assinatura text)
language sql
stable
security definer
set search_path = ''
as $$
  select substr(d.id_externo, length(p_pasta::text) + 2), d.hash_conteudo
    from public.documentos d
   where d.fonte = 'pasta' and d.arquivado_em is null and d.id_externo like p_pasta::text || ':%';
$$;

create function public.importar_documentos(payload jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pasta public.documento_pastas;
  v_total integer;
begin
  select * into v_pasta from public.documento_pastas where id = (payload->>'pasta_id')::uuid;
  if not found then
    raise exception 'Pasta de documentos não cadastrada';
  end if;

  insert into public.documentos
    (obra_id, categoria, titulo, pasta, data_documento, caminho_local, mime_type, tamanho_bytes, texto_extraido,
     obsoleto, sem_texto, fonte, id_externo, importado_em, atualizado_em_origem, hash_conteudo, status_sync, arquivado_em)
  select v_pasta.obra_id, d.categoria, d.titulo, d.pasta, d.data_documento,
         v_pasta.caminho || '\' || replace(d.relativo, '/', '\'), d.mime_type, d.tamanho_bytes, d.texto_extraido,
         coalesce(d.obsoleto, false), coalesce(d.sem_texto, false), 'pasta', v_pasta.id::text || ':' || d.relativo, now(),
         d.modificado_em, d.assinatura, 'sincronizado', null
    from jsonb_to_recordset(payload->'documentos') as d(
      relativo text, categoria text, titulo text, pasta text, data_documento date, mime_type text, tamanho_bytes bigint,
      texto_extraido text, obsoleto boolean, sem_texto boolean, modificado_em timestamptz, assinatura text)
  on conflict (fonte, id_externo) do update
    set categoria = excluded.categoria, titulo = excluded.titulo, pasta = excluded.pasta, data_documento = excluded.data_documento,
        caminho_local = excluded.caminho_local, mime_type = excluded.mime_type, tamanho_bytes = excluded.tamanho_bytes,
        texto_extraido = excluded.texto_extraido, obsoleto = excluded.obsoleto, sem_texto = excluded.sem_texto,
        atualizado_em_origem = excluded.atualizado_em_origem, hash_conteudo = excluded.hash_conteudo, arquivado_em = null;
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- Só é chamada depois de percorrer a pasta inteira: pasta inacessível não pode arquivar tudo
create function public.encerrar_leitura_documentos(p_pasta uuid, p_presentes text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  update public.documentos d
     set arquivado_em = now()
   where d.fonte = 'pasta' and d.arquivado_em is null and d.id_externo like p_pasta::text || ':%'
     and not (substr(d.id_externo, length(p_pasta::text) + 2) = any (p_presentes));
  get diagnostics v_total = row_count;
  update public.documento_pastas set ultima_leitura_em = now(), ultimo_erro = null where id = p_pasta;
  return v_total;
end;
$$;

create function public.registrar_erro_pasta(p_pasta uuid, p_erro text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.documento_pastas set ultimo_erro = left(p_erro, 500) where id = p_pasta;
$$;

-- Busca da tela Documentos. Roda com a permissão de quem consulta, então o RLS vale
create function public.buscar_documentos(p_busca text default null, p_obra uuid default null, p_categoria text default null, p_obsoletos boolean default false)
returns table (id uuid, obra_id uuid, titulo text, categoria text, pasta text, data_documento date, caminho_local text, obsoleto boolean, sem_texto boolean, url text, trecho text)
language sql
stable
set search_path = ''
as $$
  with q as (
    select case when coalesce(trim(p_busca), '') = '' then null else websearch_to_tsquery('portuguese'::regconfig, p_busca) end as t
  )
  select d.id, d.obra_id, d.titulo, d.categoria, d.pasta, d.data_documento, d.caminho_local, d.obsoleto, d.sem_texto, l.url,
         case when q.t is null then null
              else ts_headline('portuguese'::regconfig, coalesce(d.texto_extraido, d.titulo), q.t, 'MaxWords=30, MinWords=12, StartSel=«, StopSel=»') end
    from public.documentos d
    left join public.documento_links l on l.documento_id = d.id
   cross join q
   where d.arquivado_em is null
     and (q.t is null or d.busca @@ q.t)
     and (p_obra is null or d.obra_id = p_obra)
     and (p_categoria is null or d.categoria = p_categoria)
     and (p_obsoletos or not d.obsoleto)
   order by case when q.t is null then 0 else ts_rank(d.busca, q.t) end desc, d.data_documento desc nulls last, d.titulo
   limit 100;
$$;

create function public.tamanho_do_banco()
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_proprietario() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  return pg_catalog.pg_database_size(pg_catalog.current_database());
end;
$$;

revoke all on function public.listar_pastas_agente() from public, anon, authenticated, service_role;
revoke all on function public.listar_documentos_agente(uuid) from public, anon, authenticated, service_role;
revoke all on function public.importar_documentos(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.encerrar_leitura_documentos(uuid, text[]) from public, anon, authenticated, service_role;
revoke all on function public.registrar_erro_pasta(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.buscar_documentos(text, uuid, text, boolean) from public, anon;
revoke all on function public.tamanho_do_banco() from public, anon, service_role;
grant execute on function public.listar_pastas_agente() to agente_cronograma;
grant execute on function public.listar_documentos_agente(uuid) to agente_cronograma;
grant execute on function public.importar_documentos(jsonb) to agente_cronograma;
grant execute on function public.encerrar_leitura_documentos(uuid, text[]) to agente_cronograma;
grant execute on function public.registrar_erro_pasta(uuid, text) to agente_cronograma;
grant execute on function public.buscar_documentos(text, uuid, text, boolean) to authenticated;
grant execute on function public.tamanho_do_banco() to authenticated;

-- Obra piloto (decisão do proprietário em 05/11/2026). Só o caminho, a partir do cadastro da obra.
insert into public.documento_pastas (obra_id, caminho)
select o.id, o.pasta_local from public.obras o where o.codigo = 'PRF-RECANTO' and o.pasta_local is not null;
