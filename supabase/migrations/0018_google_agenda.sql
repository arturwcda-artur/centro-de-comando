-- 0018 — Controle da agenda pelo Google (ADR 0014)
-- O token do Google fica no Supabase Vault (cifrado), nunca em tabela comum nem em log.

create or replace function public.salvar_credencial(p_ferramenta text, p_valor text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := 'cc_' || p_ferramenta;
  v_id   uuid;
begin
  if not app.is_proprietario() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  select id into v_id from vault.decrypted_secrets where name = v_nome;
  if v_id is null then
    perform vault.create_secret(p_valor, v_nome);
  else
    perform vault.update_secret(v_id, p_valor);
  end if;
end;
$$;

create or replace function app.ler_credencial_interna(p_ferramenta text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'cc_' || p_ferramenta;
$$;

-- Para a aplicação, na sessão do proprietário com segundo fator
create or replace function public.ler_credencial(p_ferramenta text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_proprietario() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  return app.ler_credencial_interna(p_ferramenta);
end;
$$;

-- Para o sincronizador (chave de serviço)
create or replace function public.ler_credencial_servico(p_ferramenta text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select app.ler_credencial_interna(p_ferramenta);
$$;

revoke all on function app.ler_credencial_interna(text) from public, anon, authenticated, service_role;
revoke all on function public.salvar_credencial(text, text) from public, anon;
revoke all on function public.ler_credencial(text) from public, anon;
revoke all on function public.ler_credencial_servico(text) from public, anon, authenticated;
grant execute on function public.salvar_credencial(text, text) to authenticated;
grant execute on function public.ler_credencial(text) to authenticated;
grant execute on function public.ler_credencial_servico(text) to service_role;

alter table public.operacoes_externas drop constraint operacoes_externas_operacao_check;
alter table public.operacoes_externas add constraint operacoes_externas_operacao_check
  check (operacao in ('concluir','criar','alterar','excluir'));
