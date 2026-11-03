-- 0014 — "Minhas atribuições" inclui tarefas sem responsável (Fase 5, RN-45)
-- Num sistema de um só usuário, a tarefa criada sem responsável é do próprio gestor.

create or replace view public.v_tarefas_priorizadas with (security_invoker = on) as
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
  (b.responsavel_id is null
     or exists (select 1 from public.pessoas p where p.id = b.responsavel_id and p.eh_usuario)) as minha
from base b;
