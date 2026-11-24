-- 0038 — Conferência da nova revisão (RN-49o)
-- 1) O agente local passa a seguir a revisão mais nova do cronograma vigente na mesma pasta
--    (ex.: REV-06 → REV-07), sem o proprietário recadastrar o caminho.
-- 2) A alteração aprovada guarda o que se espera ver na nova revisão; a sincronização confere.

alter table public.avaliacoes_planejamento
  add column atividade_uid integer,
  add column inicio_esperado date,
  add column fim_esperado date,
  add column versao_conferida_id uuid references public.cronograma_versoes(id) on delete set null,
  add column conferencia text check (conferencia in ('conforme','divergente')),
  add column conferencia_detalhe text,
  add column conferida_em timestamptz;
comment on column public.avaliacoes_planejamento.atividade_uid is 'UID da atividade no Project, para achá-la na nova revisão.';
comment on column public.avaliacoes_planejamento.conferencia is 'Resultado da conferência da nova revisão contra a rota aprovada (RN-49o).';

-- O agente passa a receber o papel do arquivo
drop function public.listar_cronogramas_agente();
create function public.listar_cronogramas_agente()
returns table (id uuid, caminho text, ultimo_hash text, papel text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.caminho, a.ultimo_hash, a.papel from public.cronograma_arquivos a order by a.papel, a.caminho;
$$;
revoke all on function public.listar_cronogramas_agente() from public, anon, authenticated, service_role;
grant execute on function public.listar_cronogramas_agente() to agente_cronograma;

-- Só o cronograma vigente, só outro .mpp da mesma pasta
create function public.seguir_revisao_cronograma(p_arquivo uuid, p_caminho text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atual text;
begin
  select caminho into v_atual from public.cronograma_arquivos where id = p_arquivo and papel = 'vigente';
  if not found then
    raise exception 'Só o cronograma vigente segue a revisão mais nova';
  end if;
  if lower(p_caminho) not like '%.mpp'
     or regexp_replace(p_caminho, '[\\/][^\\/]*$', '') <> regexp_replace(v_atual, '[\\/][^\\/]*$', '') then
    raise exception 'A nova revisão precisa ser um .mpp na mesma pasta';
  end if;
  update public.cronograma_arquivos set caminho = p_caminho, ultimo_erro = null where id = p_arquivo;
end;
$$;
revoke all on function public.seguir_revisao_cronograma(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.seguir_revisao_cronograma(uuid, text) to agente_cronograma;
