-- 0037 — Cérebro do planejamento (RN-49n)
-- A decisão que afeta o planejamento é avaliada no cronograma vigente: atividade, mudança, efeito
-- calculado, conflitos e rota. O proprietário aprova ou não; o arquivo do Project nunca é alterado aqui.

alter table public.decisoes add column tarefa_planejamento_id uuid references public.tarefas(id) on delete set null;
comment on column public.decisoes.tarefa_planejamento_id is 'Tarefa "Atualizar o planejamento" criada pela ressalva (RN-49m).';

create table public.avaliacoes_planejamento (
  id               uuid primary key default gen_random_uuid(),
  decisao_id       uuid not null unique references public.decisoes(id) on delete cascade,
  obra_id          uuid references public.obras(id) on delete set null,
  versao_id        uuid references public.cronograma_versoes(id) on delete set null,
  atividade_id     uuid references public.atividades_cronograma(id) on delete set null,
  atividade_nome   text,
  tipo_mudanca     text check (tipo_mudanca in ('atrasar','adiantar','duracao')),
  dias             numeric(8,2) check (dias >= 0),
  situacao         text not null check (situacao in ('aprovada','nao_alterar')),
  termino_antes    date,
  termino_depois   date,
  variacao_uteis   integer,
  conflitos        text[] not null default '{}',
  rota             text,
  decidido_em      timestamptz not null default now(),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  check (situacao = 'nao_alterar' or (atividade_id is not null and tipo_mudanca is not null and dias is not null))
);
comment on table public.avaliacoes_planejamento is
  'Avaliação de uma decisão no cronograma vigente: efeito calculado, conflitos e rota de alteração do Project (RN-49n).';
create index avaliacoes_planejamento_obra_idx on public.avaliacoes_planejamento (obra_id, decidido_em desc);

select app.aplicar_padroes('public.avaliacoes_planejamento');
