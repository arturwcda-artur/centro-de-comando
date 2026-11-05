-- 0029 — Dados das obras vindos da varredura das pastas (decisões do proprietário em 05/11/2026)
-- Contratos da Levorsse e tudo da ANP ficam de fora por enquanto. Campos sem fonte segura ficam vazios.

insert into public.documento_pastas (obra_id, caminho)
select o.id, o.pasta_local
from public.obras o
where o.codigo in ('CANDANGOLANDIA', 'LEVORSSE-CONTAINER', 'LEVORSSE-MANUTENCAO', 'LEVORSSE-NILLS', 'PISO-ELEVADO-PRODASEN', 'SENADO-FEDERAL-BLOCO-14')
  and o.pasta_local is not null
on conflict (obra_id) do nothing;

insert into public.cronograma_arquivos (obra_id, papel, caminho)
select o.id, 'vigente', o.pasta_local || a.relativo
from public.obras o
join (values
  ('CANDANGOLANDIA', '\01_Planejamento_e_Cronograma\CRONOGRAMA.mpp'),
  ('LEVORSSE-NILLS', '\03_PLANEJAMENTO\03.1_CRONOGRAMA_MS-PROJECT\NILLS-CRN-001_R00_Cronograma.mpp'),
  ('SENADO-FEDERAL-BLOCO-14', '\01_Planejamento_e_Cronograma\ENTREGA_PROVISORIA\PLANEJAMENTO SENADO _ SERVIÇOS PEDENTES.mpp')
) as a (codigo, relativo) on a.codigo = o.codigo
where o.pasta_local is not null
on conflict (obra_id, caminho) do nothing;

-- Contrato Administrativo 49/2025 (SEEDF): 548 dias de execução, contados da Ordem de Serviço
insert into public.contratos (obra_id, contratante_id, numero, data_assinatura, prazo_original_dias, valor_original)
select o.id, o.contratante_id, '49/2025', date '2025-05-20', 548, 12424182.49
from public.obras o where o.codigo = 'CANDANGOLANDIA'
on conflict (obra_id, numero) do nothing;

insert into public.aditivos (contrato_id, numero, tipo, valor_delta, data_assinatura, situacao)
select c.id, '1', 'acrescimo', 156765.73, date '2026-07-06', 'aprovado'
from public.contratos c
join public.obras o on o.id = c.obra_id
where o.codigo = 'CANDANGOLANDIA' and c.numero = '49/2025'
on conflict (contrato_id, numero) do nothing;

-- Contrato 2024/0159: início pela Ordem de Serviço nº 01. Valor confirmado pelo proprietário
insert into public.contratos (obra_id, contratante_id, numero, data_inicio, valor_original)
select o.id, o.contratante_id, '2024/0159', date '2024-10-07', 4599000.00
from public.obras o where o.codigo = 'SENADO-FEDERAL-BLOCO-14'
on conflict (obra_id, numero) do nothing;
