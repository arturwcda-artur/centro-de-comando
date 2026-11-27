-- 0041 — Controle de ordens e gatilhos (Doutrina do Centro de Comando, 27/11/2026; RN-49t e RN-49u)
-- 1) Ordem = tarefa que nasceu de uma decisão do gestor: delegada à equipe (Delegar) ou assumida por
--    ele (Fazer eu). A Mesa cobra só ordens; a ordem concluída espera o gestor conferir o efeito.
-- 2) Gatilhos: o que toca o alarme é escolhido pelo gestor, com o limite de cada um.

alter table public.tarefas
  add column ordem_tipo text check (ordem_tipo in ('delegada', 'comigo')),
  add column ordem_em timestamptz,
  add column ordem_conferida_em timestamptz;
comment on column public.tarefas.ordem_tipo is 'Ordem do gestor: delegada à equipe (Delegar) ou comigo (Fazer eu). Nula = não é ordem (RN-49t).';
comment on column public.tarefas.ordem_em is 'Quando a ordem foi dada.';
comment on column public.tarefas.ordem_conferida_em is 'Quando o gestor conferiu o resultado da ordem concluída.';

-- Ordens já dadas: cartões criados pelo sistema no quadro da equipe e tarefas delegadas pela Mesa
update public.tarefas t set ordem_tipo = 'delegada', ordem_em = o.executado_em
from public.operacoes_externas o
where o.registro_id = t.id and o.ferramenta = 'trello' and o.operacao = 'criar' and o.entidade = 'tarefas'
  and o.status = 'sucesso' and o.detalhe like 'https://%' and t.ordem_tipo is null;
update public.tarefas t set ordem_tipo = 'delegada', ordem_em = coalesce(t.ordem_em, d.atualizado_em)
from public.decisoes d
where d.tarefa_id = t.id and t.fonte = 'trello' and t.ordem_tipo is null;

create index tarefas_ordem_idx on public.tarefas (ordem_tipo) where ordem_tipo is not null;

create table public.gatilhos (
  chave       text primary key,
  titulo      text not null,
  ativo       boolean not null default true,
  limite      integer not null check (limite >= 0),
  unidade     text not null,
  ordem       integer not null default 0,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
comment on table public.gatilhos is 'O que toca o alarme, escolhido pelo gestor (RN-49u). Desligado: o item continua na ficha, sem ir para a Mesa.';

insert into public.gatilhos (chave, titulo, limite, unidade, ordem) values
  ('ordem_vencida', 'Ordem delegada vencida há', 3, 'dias', 1),
  ('ordem_parada', 'Ordem delegada parada há', 7, 'dias', 2),
  ('medicao_do_mes', 'Medição do mês anterior não cadastrada até o dia', 5, 'dia do mês', 3),
  ('prazo_contratual', 'Cronograma terminando depois do contrato', 0, 'dias de tolerância', 4),
  ('caminho_critico', 'Atividade do caminho crítico vencida sem concluir', 0, 'dias de tolerância', 5),
  ('cronograma_desatualizado', 'Cronograma vigente sem alteração há mais de', 7, 'dias', 6),
  ('aditivo_em_analise', 'Aditivo em análise há mais de', 30, 'dias', 7),
  ('diario_sem_registro', 'Diário de obra sem registro há mais de', 4, 'dias', 8),
  ('problema_critico', 'Problema em aberto com GUT a partir de', 64, 'pontos GUT', 9);

select app.aplicar_padroes('public.gatilhos', true);
