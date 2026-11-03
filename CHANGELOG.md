# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Datas em America/Sao_Paulo.

## [0.3.0] — 2026-11-03 — Fase 3: Dashboard e navegação
### Adicionado
- Aplicação Next.js 16 em `apps/web` (React 19, TypeScript, Tailwind 4), em português e no fuso de São Paulo.
- Login com e-mail e senha e **segundo fator obrigatório** (TOTP): cadastro com QR code e verificação a cada login.
- `proxy.ts` com as regras de acesso numa função pura testada, mais revalidação no servidor (`exigirSessaoCompleta`).
- Migration `0012_exigir_mfa.sql`: o banco só libera dados para sessões `aal2` (ADR 0011).
- Layout com menu lateral agrupado (gaveta no celular), busca global (Ctrl+K) em obras, tarefas e documentos, e páginas de cada módulo indicando a fase de entrega.
- Painel executivo sobre as views: obras (total, andamento, planejamento, próximas da conclusão, com atraso), atividades vencidas, riscos críticos, carteira financeira, prioridades, compromissos de hoje, vencimentos, decisões pendentes e obras com atraso. Filtros por obra e período.
- PWA instalável: manifest, ícones e service worker que não guarda dados em cache.
- Cabeçalhos de segurança: CSP, HSTS, `X-Frame-Options`, `noindex`.
- 14 testes da aplicação web e 22 do banco. Novo job de CI: tipos, lint, testes e build.
- ADRs 0010 (sem `cacheComponents`) e 0011 (MFA no banco).

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

- Tarefa "Centro de Comando - Backup semanal" registrada no Agendador de Tarefas: segundas às 08:00, com execução assim que possível se o horário foi perdido.

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
