-- 0011 — Endurecimento para a nuvem (Fase 2)
--   * fuso padrão das sessões da API
--   * search_path fixo em todas as funções de app (alerta "function_search_path_mutable" do Supabase)
--   * trilha de auditoria imutável
--   * proprietário e auditoria inacessíveis pela API

alter role authenticated set timezone = 'America/Sao_Paulo';
alter role service_role  set timezone = 'America/Sao_Paulo';

alter function app.tocar_atualizado_em()             set search_path = '';
alter function app.hoje()                            set search_path = '';
alter function app.aplicar_padroes(regclass, boolean) set search_path = '';

-- Auditoria: só acréscimo. Correções de histórico exigem desativar o trigger conscientemente, via migration.
create or replace function app.bloquear_alteracao_auditoria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'app.auditoria é somente acréscimo (operação % recusada)', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger tg_auditoria_imutavel
  before update or delete on app.auditoria
  for each row execute function app.bloquear_alteracao_auditoria();

create trigger tg_auditoria_sem_truncate
  before truncate on app.auditoria
  for each statement execute function app.bloquear_alteracao_auditoria();

revoke all on app.proprietario from public, anon, authenticated;
revoke all on app.auditoria    from public, anon, authenticated;
revoke all on function app.aplicar_padroes(regclass, boolean) from public, anon, authenticated;
revoke all on function app.registrar_auditoria()              from public, anon, authenticated;
