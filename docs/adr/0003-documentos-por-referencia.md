# ADR 0003 — Documentos por referência ao Google Drive
**Status:** Aceita · **Data:** 2026-11-03

## Contexto
O acervo tem 9,4 GB e já é sincronizado pelo Google Drive para computador.

## Decisão
Não copiar arquivos para o Supabase Storage. Guardar índice (metadados, drive_file_id, caminho local, texto extraído para busca). Storage só para anexos novos criados no próprio sistema.

## Consequências
Sem duplicidade nem custo de armazenamento; busca depende de extração de texto (OCR para PDFs escaneados fica para a Fase 8).
