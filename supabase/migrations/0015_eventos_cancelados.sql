-- 0015 — Eventos removidos ou cancelados na origem (Fase 5, ADR 0012)
-- O Google Agenda é a fonte oficial dos compromissos (ADR 0004). Quando um evento some da
-- origem, o espelho NÃO é apagado: fica marcado com cancelado_em e sai das telas.

alter table public.eventos add column cancelado_em timestamptz;
comment on column public.eventos.cancelado_em is 'Preenchido quando o evento foi cancelado ou removido na ferramenta de origem.';

drop index if exists public.eventos_inicio_idx;
create index eventos_inicio_idx on public.eventos (inicio) where cancelado_em is null;
