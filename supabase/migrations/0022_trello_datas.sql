-- 0022 — Datas reais dos cartões do quadro detalhado, para a taxa de eficiência (ADR 0017, RN-49a)
-- tarefas.concluida_em guarda a última atividade do cartão: um comentário depois da conclusão a muda.

create table public.trello_cartao_datas (
  tarefa_id      uuid primary key references public.tarefas(id) on delete cascade,
  criado_em      timestamptz not null,
  concluido_em   timestamptz,
  prazo_original date,
  prazo_alteracoes integer not null default 0,
  atualizado_em  timestamptz not null default now()
);
comment on table public.trello_cartao_datas is 'Criação, conclusão real e prazo original do cartão, lidos do histórico do Trello.';
comment on column public.trello_cartao_datas.prazo_original is 'Primeira data de entrega do cartão. É a referência da taxa de eficiência, para adiar o prazo não melhorar a taxa.';

select app.aplicar_padroes('public.trello_cartao_datas', false);
