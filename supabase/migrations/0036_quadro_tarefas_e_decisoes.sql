-- 0036 — Quadro pessoal "tarefas" no Trello e decisão ao concluir (RN-49l, RN-49m)
-- Decisão do proprietário em 23/11/2026:
--   * toda tarefa criada no sistema (inclusive ação 5W2H) tem um cartão espelho no quadro "tarefas",
--     que vai para "concluidos" quando a tarefa é concluída; o sistema continua sendo a fonte da tarefa;
--   * ao concluir, a saída/decisão fica registrada na obra, com a ressalva de que afeta o planejamento.

alter table public.tarefas add column trello_cartao_id text unique;
comment on column public.tarefas.trello_cartao_id is
  'Cartão espelho no quadro pessoal "tarefas" do Trello (só tarefas criadas no sistema). A tarefa continua sendo editada aqui.';

alter table public.decisoes
  add column tarefa_id uuid references public.tarefas(id) on delete set null,
  add column afeta_planejamento boolean not null default false;
comment on column public.decisoes.tarefa_id is 'Tarefa em cuja conclusão a decisão foi tomada.';
comment on column public.decisoes.afeta_planejamento is 'Ressalva: a decisão altera o planejamento (cronograma) da obra e precisa ser avaliada nele.';
create index decisoes_tarefa_idx on public.decisoes (tarefa_id);
create index decisoes_planejamento_idx on public.decisoes (obra_id) where afeta_planejamento;
