-- 0027 — Leituras do agente local aparecem nas integrações (Fase 9)
-- MS Project, Excel e pastas das obras não passam pelo sincronizador: quem informa é o agente.

alter table public.conectores drop constraint conectores_ferramenta_check;
alter table public.conectores add constraint conectores_ferramenta_check check (ferramenta in (
  'trello','google_agenda','google_drive','notion','excel','msproject','github','gmail','todoist','pastas'));

create function public.registrar_execucao_agente(p_ferramenta text, p_lidos integer, p_ignorados integer, p_erros integer, p_mensagem text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conector uuid;
  v_nome     text := case p_ferramenta when 'msproject' then 'MS Project' when 'excel' then 'Excel' when 'pastas' then 'Pastas das obras' end;
begin
  if v_nome is null then
    raise exception 'Ferramenta do agente inválida';
  end if;

  insert into public.conectores (ferramenta, nome_exibicao, ativo, intervalo_minutos)
  values (p_ferramenta, v_nome, true, 10080)
  on conflict (ferramenta) do update set ativo = true
  returning id into v_conector;

  insert into public.sync_execucoes (conector_id, gatilho, finalizado_em, status, lidos, ignorados, erros, mensagem)
  values (v_conector, 'agendado', now(), case when p_erros > 0 then 'parcial' else 'sucesso' end, p_lidos, p_ignorados, p_erros, left(p_mensagem, 500));

  update public.conectores
     set estado_conexao = case when p_erros > 0 then 'erro' else 'conectado' end,
         ultima_sync_em = now(),
         proxima_sync_em = now() + interval '7 days'
   where id = v_conector;
end;
$$;

revoke all on function public.registrar_execucao_agente(text, integer, integer, integer, text) from public, anon, authenticated, service_role;
grant execute on function public.registrar_execucao_agente(text, integer, integer, integer, text) to agente_cronograma;
