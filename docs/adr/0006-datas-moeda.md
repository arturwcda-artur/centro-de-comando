# ADR 0006 — Datas, fuso e moeda
**Status:** Aceita · **Data:** 2026-11-03

## Contexto
A agenda usa America/Belem e America/Sao_Paulo (ambos UTC−3 hoje). O sistema exige America/Sao_Paulo e R$.

## Decisão
Instantes em timestamptz; datas civis em date; 'hoje' = app.hoje() em America/Sao_Paulo; papel authenticated com timezone America/Sao_Paulo. Valores numeric(14,2) em R$.

## Consequências
Sem erro de arredondamento nem de virada de dia; mudanças futuras de horário de verão tratadas pelo tzdata.
