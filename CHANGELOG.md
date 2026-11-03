# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Datas em America/Sao_Paulo.

## [0.2.0] — 2026-11-03 — Fase 2: Infraestrutura e segurança (preparação)
### Adicionado
- Projeto Supabase CLI (`supabase/config.toml`): cadastro público desligado, política de senha forte, MFA TOTP, seed desligado.
- Migration `0011_endurecimento.sql`: fuso America/Sao_Paulo nas sessões da API, `search_path` fixo nas funções, auditoria imutável (bloqueia UPDATE, DELETE e TRUNCATE), schema `app` inacessível pela API.
- 4 novos testes de segurança, totalizando 21.
- Agente local: `cc_agente.backup` (pg_dump com retenção, senha por variável de ambiente, arquivo parcial nunca vira backup) e 10 testes pytest.
- CI: testes do agente local, `npm audit`, varredura de segredos (gitleaks); Dependabot semanal.
- DEPLOYMENT.md com o passo a passo da primeira implantação.

### Alterado
- Migrations movidas de `packages/db/migrations` para `supabase/migrations`, a pasta padrão do Supabase CLI.

### Implantado
- Projeto Supabase `maocgnsdhozsyrbxvqvr` (sa-east-1) com as migrations 0001 a 0011 aplicadas. O acesso anônimo à API foi verificado como bloqueado.

- Usuário proprietário criado e registrado em `app.proprietario`.
- Backup testado: `pg_dump` 17.11, dump de 146 KB conferido com `pg_restore --list`.
- `agente-local/backup.cmd` para o Agendador de Tarefas. A configuração fica em `%USERPROFILE%\.centro-de-comando` (fora de AppData, que é virtualizado para apps MSIX), e a senha vai em campo separado (`SUPABASE_DB_PASSWORD`).

### Pendente (depende do proprietário)
- Registrar a tarefa semanal no Agendador de Tarefas (comando em DEPLOYMENT.md, seção D).

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
