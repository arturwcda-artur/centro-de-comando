-- 0025 — Quem marcou cada item de checklist como concluído (ADR 0017, RN-49c)
-- O crédito do item vai para quem resolveu, não para quem está atribuído ao cartão.

alter table public.trello_checklist_itens add column concluido_por_id uuid references public.trello_membros(id) on delete set null;
comment on column public.trello_checklist_itens.concluido_por_id is 'Membro que marcou o item como concluído no Trello. Quem recebe o crédito na tela Equipe.';
