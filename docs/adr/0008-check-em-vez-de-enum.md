# ADR 0008 — CHECK em vez de tipos ENUM
**Status:** Aceita · **Data:** 2026-11-03

## Contexto
Listas de situação/tipo vão evoluir (novas situações de obra, novos conectores).

## Decisão
Usar text com CHECK constraint.

## Consequências
Alterar a lista é um ALTER de constraint simples e transacional; mensagens de erro claras nos testes.
