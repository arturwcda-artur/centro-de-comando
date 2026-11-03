# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Datas em America/Sao_Paulo.

## [0.1.0] — 2026-11-03 — Fase 1: Arquitetura e modelagem
### Adicionado
- Repositório monorepo (`apps/`, `packages/`, `agente-local/`, `docs/`).
- Documentação permanente: README, ARCHITECTURE, DATABASE, INTEGRATIONS, SECURITY, DEPLOYMENT, ROADMAP, REGRAS_DE_NEGOCIO, dicionário de dados gerado automaticamente.
- ADRs 0001–0009.
- 10 migrations SQL: 29 tabelas e 5 views, com RLS para proprietário único, auditoria por trigger e bloco de origem com idempotência `(fonte, id_externo)`.
- 17 testes automatizados do modelo, rodando em PostgreSQL descartável (PGlite).
- CI no GitHub Actions rodando os testes a cada push.

## [0.0.1] — 2026-11-03 — Fase 0: Auditoria
### Adicionado
- Oito documentos de diagnóstico em `docs/fase-0`.
