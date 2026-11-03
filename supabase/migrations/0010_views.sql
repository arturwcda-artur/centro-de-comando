-- 0010 — Views de leitura (dashboard, "Meu dia" e, futuramente, a IA).
-- security_invoker: as views respeitam o RLS de quem consulta.
-- Regras de cálculo documentadas em docs/REGRAS_DE_NEGOCIO.md.

create view public.v_contratos_resumo with (security_invoker = on) as
select
  c.id                                   as contrato_id,
  c.obra_id,
  c.numero,
  c.valor_original,
  coalesce(a.valor_aditivos, 0)          as valor_aditivos,
  c.valor_original + coalesce(a.valor_aditivos, 0) as valor_contratado,
  c.data_termino_original,
  c.data_termino_original + coalesce(a.dias_aditivos, 0) as data_termino_vigente,
  coalesce(m.valor_medido, 0)            as valor_medido,
  coalesce(l.valor_faturado, 0)          as valor_faturado,
  coalesce(l.valor_recebido, 0)          as valor_recebido,
  c.valor_original + coalesce(a.valor_aditivos, 0) - coalesce(m.valor_medido, 0) as saldo_a_medir,
  coalesce(l.valor_faturado, 0) - coalesce(l.valor_recebido, 0)                as saldo_a_receber
from public.contratos c
left join lateral (
  select sum(valor_delta) as valor_aditivos, sum(dias_delta)::integer as dias_aditivos
  from public.aditivos where contrato_id = c.id and situacao = 'aprovado'
) a on true
left join lateral (
  select sum(valor_medido - valor_glosado) as valor_medido
  from public.medicoes where contrato_id = c.id and situacao in ('aprovada','glosada')
) m on true
left join lateral (
  select
    sum(valor) filter (where tipo = 'faturamento' and data_efetiva is not null) as valor_faturado,
    sum(valor) filter (where tipo = 'recebimento' and data_efetiva is not null) as valor_recebido
  from public.lancamentos_financeiros where contrato_id = c.id
) l on true
where c.arquivado_em is null;

create view public.v_obra_resumo with (security_invoker = on) as
select
  o.id as obra_id,
  o.codigo,
  o.nome,
  o.situacao,
  o.empresa_id,
  o.contratante_id,
  o.data_inicio,
  o.data_termino_prevista,
  max(cr.data_termino_vigente)                 as data_termino_contratual_vigente,
  coalesce(sum(cr.valor_contratado), 0)        as valor_contratado,
  coalesce(sum(cr.valor_medido), 0)            as valor_medido,
  coalesce(sum(cr.valor_faturado), 0)          as valor_faturado,
  coalesce(sum(cr.valor_recebido), 0)          as valor_recebido,
  coalesce(sum(cr.saldo_a_medir), 0)           as saldo_a_medir,
  case when coalesce(sum(cr.valor_contratado), 0) > 0
       then round(100 * sum(cr.valor_medido) / sum(cr.valor_contratado), 2) end as pct_financeiro,
  af.previsto_acum                             as pct_fisico_previsto,
  af.realizado_acum                            as pct_fisico_realizado,
  af.data_referencia                           as data_avanco,
  af.realizado_acum - af.previsto_acum         as desvio_fisico,
  case when o.situacao not in ('concluida','cancelada') and max(cr.data_termino_vigente) is not null
       then greatest(0, app.hoje() - max(cr.data_termino_vigente)) end as dias_alem_do_prazo
from public.obras o
left join public.v_contratos_resumo cr on cr.obra_id = o.id
left join lateral (
  select previsto_acum, realizado_acum, data_referencia
  from public.avanco_fisico where obra_id = o.id
  order by data_referencia desc limit 1
) af on true
where o.arquivado_em is null
group by o.id, af.previsto_acum, af.realizado_acum, af.data_referencia;

-- Priorização automática (não altera prazos): escore = 3·urgência + 2·importância + 2·impacto  (7 a 35)
create view public.v_tarefas_priorizadas with (security_invoker = on) as
with base as (
  select
    t.*,
    t.prazo - app.hoje() as dias_para_prazo,
    case
      when t.prazo is null                  then 1
      when t.prazo <= app.hoje()            then 5
      when t.prazo - app.hoje() <= 2        then 4
      when t.prazo - app.hoje() <= 7        then 3
      when t.prazo - app.hoje() <= 15       then 2
      else 1
    end as urgencia
  from public.tarefas t
  where t.status not in ('concluida','cancelada')
)
select
  b.*,
  b.prazo < app.hoje()  as vencida,
  b.prazo = app.hoje()  as vence_hoje,
  (3 * b.urgencia + 2 * b.importancia + 2 * b.impacto)::smallint as escore,
  exists (select 1 from public.pessoas p where p.id = b.responsavel_id and p.eh_usuario) as minha
from base b;

create view public.v_vencimentos with (security_invoker = on) as
  select 'tarefa'::text as tipo, t.id as registro_id, t.obra_id, t.titulo as descricao, t.prazo as data
  from public.tarefas t
  where t.status not in ('concluida','cancelada') and t.prazo is not null
union all
  select 'marco', m.id, m.obra_id, m.nome, coalesce(m.data_prevista, m.data_contratual)
  from public.marcos m
  where m.data_real is null and coalesce(m.data_prevista, m.data_contratual) is not null
union all
  select 'termino_contrato', cr.contrato_id, cr.obra_id, 'Término do contrato ' || cr.numero, cr.data_termino_vigente
  from public.v_contratos_resumo cr
  where cr.data_termino_vigente is not null
union all
  select 'recebimento_previsto', l.id, c.obra_id, coalesce(l.observacoes, 'Recebimento previsto'), l.data_prevista
  from public.lancamentos_financeiros l join public.contratos c on c.id = l.contrato_id
  where l.tipo = 'previsao_recebimento' and l.data_efetiva is null
union all
  select 'decisao', d.id, d.obra_id, d.problema, d.prazo
  from public.decisoes d
  where d.status = 'pendente' and d.prazo is not null;

create view public.v_riscos_criticos with (security_invoker = on) as
select r.*
from public.riscos r
where r.status in ('aberto','em_tratamento') and r.severidade >= 15;
