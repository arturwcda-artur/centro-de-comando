-- 0028 — Assistente pelo Claude: só leitura (ADR 0021)
-- Token emitido para um cliente OAuth não vale como proprietário em nenhuma tabela.
-- Ele só chama as funções assistente_*, que devolvem campos escolhidos e escondem texto com credencial.

create or replace function app.is_proprietario()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and auth.jwt() ->> 'client_id' is null
     and exists (select 1 from app.proprietario p where p.user_id = auth.uid());
$$;
comment on function app.is_proprietario() is
  'Verdadeiro se o proprietário entrou direto no sistema com segundo fator (aal2). Token de cliente OAuth não passa. Base de todas as políticas RLS.';

create function app.exigir_assistente()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.jwt() ->> 'client_id' is null
     or not exists (select 1 from app.proprietario p where p.user_id = auth.uid()) then
    raise exception 'Acesso restrito ao assistente autorizado' using errcode = '42501';
  end if;
end;
$$;

-- Mesma regra do sincronizador (RN-66), mais a lista de cartões pessoais
create function app.texto_sensivel(p_texto text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_texto, '') ~* '(senha|password|pass|pin)\s*[:=]';
$$;

create function app.lista_sensivel(p_lista text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_lista, '') ~* 'senha|password|credencia|login|token|cart[oõ]es';
$$;

create function public.assistente_verificar()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.exigir_assistente();
  return true;
end;
$$;

create function public.assistente_obras()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.exigir_assistente();
  return jsonb_build_object(
    'fonte', 'Obras, contratos e avanço físico do Centro de Comando',
    'consultado_em', now(),
    'dados', coalesce((
      select jsonb_agg(jsonb_build_object(
        'codigo', o.codigo, 'nome', o.nome, 'situacao', o.situacao,
        'termino_previsto', o.data_termino_prevista, 'termino_contratual', o.data_termino_contratual_vigente,
        'valor_contratado', o.valor_contratado, 'valor_medido', o.valor_medido, 'saldo_a_medir', o.saldo_a_medir,
        'percentual_financeiro', o.pct_financeiro, 'fisico_previsto', o.pct_fisico_previsto,
        'fisico_realizado', o.pct_fisico_realizado, 'data_do_avanco', o.data_avanco
      ) order by o.nome)
      from public.v_obra_resumo o
    ), '[]'::jsonb)
  );
end;
$$;

create function public.assistente_tarefas(p_obra text default null, p_somente_vencidas boolean default false, p_limite integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.exigir_assistente();
  return jsonb_build_object(
    'fonte', 'Tarefas sincronizadas do Trello e do Notion, e tarefas do sistema',
    'consultado_em', now(),
    'ultima_sincronizacao', (select max(c.ultima_sync_em) from public.conectores c where c.ferramenta in ('trello', 'notion')),
    'dados', coalesce((
      select jsonb_agg(to_jsonb(x) - 'ordem' order by x.ordem)
      from (
        select row_number() over (order by t.escore desc, t.prazo nulls last) as ordem,
               t.titulo, t.status, t.prazo, t.vencida, t.escore as prioridade, t.fonte as origem,
               o.codigo as obra,
               (select jsonb_agg(m.nome order by m.nome)
                  from public.tarefa_membros tm
                  join public.trello_membros m on m.id = tm.membro_id
                 where tm.tarefa_id = t.id) as responsaveis
        from public.v_tarefas_priorizadas t
        left join public.obras o on o.id = t.obra_id
        where not app.texto_sensivel(t.titulo)
          and not app.lista_sensivel(t.categoria)
          and (not p_somente_vencidas or t.vencida)
          and (p_obra is null or position(lower(p_obra) in lower(coalesce(o.codigo, '') || ' ' || coalesce(o.nome, ''))) > 0)
        order by t.escore desc, t.prazo nulls last
        limit greatest(1, least(coalesce(p_limite, 50), 100))
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create function public.assistente_contratos()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.exigir_assistente();
  return jsonb_build_object(
    'fonte', 'Contratos, aditivos e medições do Centro de Comando',
    'consultado_em', now(),
    'dados', coalesce((
      select jsonb_agg(jsonb_build_object(
        'numero', c.numero, 'obra', o.codigo,
        'termino_original', c.data_termino_original, 'termino_vigente', c.data_termino_vigente,
        'valor_original', c.valor_original, 'valor_aditivos', c.valor_aditivos, 'valor_contratado', c.valor_contratado,
        'valor_medido', c.valor_medido, 'valor_faturado', c.valor_faturado, 'valor_recebido', c.valor_recebido,
        'saldo_a_medir', c.saldo_a_medir, 'saldo_a_receber', c.saldo_a_receber
      ) order by c.numero)
      from public.v_contratos_resumo c
      left join public.obras o on o.id = c.obra_id
    ), '[]'::jsonb)
  );
end;
$$;

create function public.assistente_vencimentos(p_dias integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.exigir_assistente();
  return jsonb_build_object(
    'fonte', 'Prazos de tarefas, marcos, contratos, recebimentos e decisões',
    'consultado_em', now(),
    'dados', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.data)
      from (
        select v.tipo, v.descricao, v.data, o.codigo as obra
        from public.v_vencimentos v
        left join public.obras o on o.id = v.obra_id
        left join public.tarefas t on v.tipo = 'tarefa' and t.id = v.registro_id
        where v.data <= app.hoje() + greatest(0, least(coalesce(p_dias, 30), 365))
          and not app.texto_sensivel(v.descricao)
          and not app.lista_sensivel(t.categoria)
        order by v.data
        limit 100
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create function public.assistente_riscos()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.exigir_assistente();
  return jsonb_build_object(
    'fonte', 'Riscos e decisões registrados no Centro de Comando',
    'consultado_em', now(),
    'riscos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'descricao', r.descricao, 'severidade', r.severidade, 'status', r.status,
        'prazo', r.prazo, 'plano', r.plano_resposta, 'obra', o.codigo
      ) order by r.severidade desc)
      from public.riscos r
      left join public.obras o on o.id = r.obra_id
      where r.status in ('aberto', 'em_tratamento')
        and not app.texto_sensivel(r.descricao)
        and not app.texto_sensivel(r.plano_resposta)
    ), '[]'::jsonb),
    'decisoes_pendentes', coalesce((
      select jsonb_agg(jsonb_build_object('problema', d.problema, 'prazo', d.prazo, 'obra', o.codigo) order by d.prazo nulls last)
      from public.decisoes d
      left join public.obras o on o.id = d.obra_id
      where d.status = 'pendente' and not app.texto_sensivel(d.problema)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function app.exigir_assistente() from public, anon, authenticated, service_role;
revoke all on function app.texto_sensivel(text) from public, anon, authenticated, service_role;
revoke all on function app.lista_sensivel(text) from public, anon, authenticated, service_role;

revoke all on function public.assistente_verificar() from public, anon, service_role;
revoke all on function public.assistente_obras() from public, anon, service_role;
revoke all on function public.assistente_tarefas(text, boolean, integer) from public, anon, service_role;
revoke all on function public.assistente_contratos() from public, anon, service_role;
revoke all on function public.assistente_vencimentos(integer) from public, anon, service_role;
revoke all on function public.assistente_riscos() from public, anon, service_role;

grant execute on function public.assistente_verificar() to authenticated;
grant execute on function public.assistente_obras() to authenticated;
grant execute on function public.assistente_tarefas(text, boolean, integer) to authenticated;
grant execute on function public.assistente_contratos() to authenticated;
grant execute on function public.assistente_vencimentos(integer) to authenticated;
grant execute on function public.assistente_riscos() to authenticated;
