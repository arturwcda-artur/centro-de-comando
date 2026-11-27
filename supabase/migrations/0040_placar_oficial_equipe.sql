-- 0040 — Placar oficial da equipe (RN-49p, decisão do proprietário em 27/11/2026)
-- 1) O item de checklist guarda a data da PRIMEIRA vez que foi marcado. Desmarcar e marcar de novo
--    no Trello não muda mais a data em que a resolução conta.
-- 2) Ao fechar a semana ou o mês do calendário, o placar fica gravado e não muda mais: é ele que vale
--    para a disputa e para o relatório enviado à equipe. O período em andamento é parcial.
-- Sem auditoria, como o espelho do Trello (0021): o placar guarda títulos de itens de terceiros.

alter table public.trello_checklist_itens add column primeiro_concluido_em timestamptz;
comment on column public.trello_checklist_itens.primeiro_concluido_em is 'Primeira vez que o item foi visto marcado. É a data que conta no placar (RN-49p).';

update public.trello_checklist_itens set primeiro_concluido_em = concluido_em where concluido and concluido_em is not null;

create function app.guardar_primeira_marcacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.primeiro_concluido_em is not null then
    new.primeiro_concluido_em := old.primeiro_concluido_em;
  elsif new.concluido and new.concluido_em is not null then
    new.primeiro_concluido_em := coalesce(new.primeiro_concluido_em, new.concluido_em);
  end if;
  return new;
end;
$$;

create trigger tg_primeira_marcacao before insert or update on public.trello_checklist_itens
  for each row execute function app.guardar_primeira_marcacao();

create table public.equipe_placares (
  id          uuid primary key default gen_random_uuid(),
  quadro      text not null,
  tipo        text not null check (tipo in ('semana', 'mes')),
  inicio      date not null,
  fim         date not null check (fim > inicio),
  dados       jsonb not null,
  fechado_em  timestamptz not null default now(),
  unique (quadro, tipo, inicio)
);
comment on table public.equipe_placares is 'Placar oficial da equipe por semana ou mês fechado (RN-49p). Gravado uma vez, não muda.';
comment on column public.equipe_placares.fim is 'Primeiro dia depois do período (exclusivo).';
comment on column public.equipe_placares.dados is 'Números do período como apareciam na tela Equipe no fechamento.';

select app.aplicar_padroes('public.equipe_placares', false);

create function app.bloquear_alteracao_placar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Placar oficial fechado não muda';
end;
$$;

create trigger tg_placar_imutavel before update on public.equipe_placares
  for each row execute function app.bloquear_alteracao_placar();
