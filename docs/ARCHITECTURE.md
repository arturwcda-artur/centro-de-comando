# Arquitetura

## Visão geral
```
┌─────────────────────────── APRESENTAÇÃO ───────────────────────────┐
│ Next.js (App Router) · React · TypeScript · Tailwind · shadcn/ui    │
│ PWA instalável · pt-BR · America/Sao_Paulo · R$                     │
└──────────────────────────────┬──────────────────────────────────────┘
┌────────────────────────────── APLICAÇÃO ────────────────────────────┐
│ apps/web/src/domain    regras de negócio puras (sem I/O)            │
│ apps/web/src/services  casos de uso (orquestram domínio + banco)    │
│ apps/web/src/app       telas e route handlers (API REST interna)    │
└──────────────┬──────────────────────────────┬───────────────────────┘
┌──────────────▼────────────┐   ┌──────────────▼───────────────────────┐
│ DADOS — Supabase          │   │ INTEGRAÇÕES (isoladas)               │
│ PostgreSQL + RLS          │◄──│ packages/integrations/<ferramenta>   │
│ Auth (1 usuário + MFA)    │   │ agente-local/ (Python, PC Windows)   │
│ Auditoria por trigger     │   │                                      │
│ Views de leitura          │   │                                      │
└───────────────────────────┘   └──────────────────────────────────────┘
┌──────────────────────── IA (Fase 10) ──────────────────────────────┐
│ packages/ai-gateway: provedor configurável; lê só as views          │
└─────────────────────────────────────────────────────────────────────┘
```

## Regras de dependência entre camadas
1. `domain` não importa nada de banco, rede ou framework.
2. `integrations` traduz dados externos para o formato do banco. Nunca contém regra de gestão, como prioridade, saldo ou atraso.
3. As regras calculáveis em SQL (saldos, prazos vigentes, escore de prioridade) ficam nas **views**. Assim a tela, os relatórios e a IA leem o mesmo número.
4. A UI nunca usa a chave `service_role`.

## Componentes
| Componente | Responsabilidade | Fase |
|---|---|---|
| `packages/db` | Esquema, migrations, testes do modelo, dicionário | 1 ✅ |
| Supabase | Banco, Auth, Vault, cron, Storage (só anexos novos) | 2 |
| `apps/web` | Interface, API interna, PWA | 3 |
| `packages/integrations` | Trello, Google Agenda, Notion, Drive, GitHub | 5, 8, 9 |
| `agente-local` | MS Project (COM), Excel (openpyxl), indexação de pastas, backup `pg_dump` → Drive | 2 (backup), 6 |
| `packages/ai-gateway` | Assistente gerencial | 10 |

## Fluxo de sincronização (todas as fontes)
```
fonte externa ──► leitura ──► normalização ──► hash ──► upsert (fonte, id_externo)
                                                   │
                         hash igual → ignorado ◄───┤
          alterado nos dois lados → sync_conflitos ◄┘
cada execução → sync_execucoes (+ sync_itens por registro)
```

## Decisões
Ver [docs/adr](adr). Índice:
| ADR | Título |
|---|---|
| [0001](adr/0001-pilha-tecnologica.md) | Pilha Next.js + Supabase + Vercel |
| [0002](adr/0002-agente-local.md) | Agente local Python para MS Project e Excel |
| [0003](adr/0003-documentos-por-referencia.md) | Documentos por referência ao Google Drive |
| [0004](adr/0004-fontes-oficiais.md) | Fonte oficial por tipo de informação |
| [0005](adr/0005-escrita-externa-opt-in.md) | Gravação externa desligada por padrão |
| [0006](adr/0006-datas-moeda.md) | Datas, fuso e moeda |
| [0007](adr/0007-rls-proprietario-unico.md) | RLS por proprietário único em vez de owner_id por linha |
| [0008](adr/0008-check-em-vez-de-enum.md) | `CHECK` em vez de tipos ENUM |
| [0009](adr/0009-valores-calculados-em-views.md) | Valores consolidados calculados em views |
