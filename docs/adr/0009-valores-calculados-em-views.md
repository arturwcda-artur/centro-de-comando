# ADR 0009 — Valores consolidados calculados em views
**Status:** Aceita · **Data:** 2026-11-03

## Contexto
O risco de números divergentes entre tela, relatório e IA é alto se saldos forem gravados em várias tabelas.

## Decisão
Contratado, prazo vigente, medido, faturado, recebido, saldos, atraso e escore de prioridade são calculados em views security_invoker (0010). Fotografias históricas vão para indicadores_snapshot.

## Consequências
Uma única fórmula por indicador, testada; se desempenho exigir no futuro, views materializadas sem mudar consumidores.
