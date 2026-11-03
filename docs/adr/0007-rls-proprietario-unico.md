# ADR 0007 — RLS por proprietário único em vez de owner_id por linha
**Status:** Aceita · **Data:** 2026-11-03

## Contexto
A Fase 0 previa owner_id em todas as tabelas. O sistema tem e terá um único administrador.

## Decisão
Guardar o proprietário em app.proprietario (linha única) e usar a política proprietario_total = app.is_proprietario() em todas as tabelas, aplicada por app.aplicar_padroes().

## Consequências
Menos colunas e nenhum risco de linha sem dono; jobs com service_role não precisam preencher owner_id. Se um dia houver mais usuários, uma migration adiciona papéis/escopos sem reescrever tabelas.
