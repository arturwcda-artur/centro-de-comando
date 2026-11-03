# ADR 0002 — Agente local Python para MS Project e Excel
**Status:** Aceita · **Data:** 2026-11-03

## Contexto
MS Project e as planilhas estão no PC Windows; não há API em nuvem. O motor da retomada PRF já automatiza o MS Project via COM (pywin32) e tem testes.

## Decisão
Criar `agente-local/` em Python, executado pelo Agendador de Tarefas do Windows, que lê .mpp (COM) e .xlsx (openpyxl) e envia dados estruturados ao Supabase por HTTPS com chave restrita. Também executa o backup pg_dump para o Drive.

## Consequências
Cronograma só atualiza com o PC ligado; cada tela exibe a data da última leitura. Reaproveita código existente em vez de conversores pagos.
