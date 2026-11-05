-- 0026 — Quem concluiu cada cartão do quadro detalhado (ADR 0017, RN-49c)
-- O crédito da tarefa resolvida vai para quem marcou no Trello: o item ou, sem checklist, o cartão.

alter table public.trello_cartao_datas add column concluido_por_id uuid references public.trello_membros(id) on delete set null;
comment on column public.trello_cartao_datas.concluido_por_id is 'Membro que moveu o cartão para concluídos ou marcou o prazo como concluído.';
