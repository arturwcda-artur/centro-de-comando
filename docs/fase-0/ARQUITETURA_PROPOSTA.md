# ARQUITETURA PROPOSTA — Fase 0

## 1. Decisão resumida
A pilha sugerida no briefing (**Next.js + TypeScript + Tailwind + Supabase/PostgreSQL + Vercel + GitHub**) é adequada e **está recomendada**, com três complementos que a auditoria mostrou serem necessários:

| Complemento | Motivo |
|---|---|
| **Agente local Windows (Python)** | MS Project e Excel estão no seu disco; a nuvem não os alcança. O motor PRF já resolve COM/openpyxl e tem testes. |
| **Documentos por referência ao Google Drive** | O acervo (9,4 GB) já está no Drive. Copiar para o Supabase Storage custaria mais e duplicaria a fonte. |
| **Fila de jobs no próprio PostgreSQL** | Evita mais um serviço pago no início; `pg_cron` + tabela de jobs atendem o volume de um usuário. |

## 2. Visão em camadas

```
┌──────────────────────────── APRESENTAÇÃO ────────────────────────────┐
│ Next.js (App Router) · React · TypeScript · Tailwind · shadcn/ui      │
│ PWA (instalável no celular) · pt-BR · America/Sao_Paulo · R$          │
└───────────────────────────────┬───────────────────────────────────────┘
┌───────────────────────────── APLICAÇÃO ───────────────────────────────┐
│ Route handlers / Server Actions (API REST interna)                     │
│ /domain  → regras de negócio puras (prazos, saldos, priorização, curva S)│
│ /services→ casos de uso (registrar medição, aprovar aditivo...)        │
└───────────────┬───────────────────────────────┬───────────────────────┘
┌───────────────▼────────────┐   ┌──────────────▼─────────────────────────┐
│ DADOS (Supabase)           │   │ INTEGRAÇÕES (isoladas)                 │
│ PostgreSQL + RLS           │◄──│ /integrations/trello, google, notion,  │
│ Auth (1 usuário + MFA)     │   │ drive, github → jobs agendados          │
│ Auditoria por trigger      │   │ agente-local/ (Python) → MS Project,   │
│ Storage (só anexos novos)  │   │ Excel, pastas                          │
└────────────────────────────┘   └────────────────────────────────────────┘
┌──────────────────────────── INTELIGÊNCIA (Fase 10) ───────────────────┐
│ Camada "ai-gateway": interface única → provedor (Claude por padrão),  │
│ ferramentas de consulta SOMENTE LEITURA às views do banco,            │
│ resposta com fonte + data de atualização; registro de custo por chamada│
└───────────────────────────────────────────────────────────────────────┘
```

## 3. Escolhas técnicas e justificativas

| Tema | Recomendação | Alternativa considerada | Por que não |
|---|---|---|---|
| Frontend | Next.js 15 + React + TS + Tailwind + shadcn/ui | Remix, SvelteKit | Menor ecossistema para componentes gerenciais |
| Gráficos | Recharts (Curva S, barras) + tabela TanStack Table | ECharts | Ambos servem; Recharts integra melhor com React |
| Banco | PostgreSQL no Supabase | Neon, Railway | Supabase entrega Auth + RLS + Storage + cron juntos |
| ORM/consultas | SQL versionado (migrations Supabase) + `supabase-js` tipado; Drizzle opcional | Prisma | Prisma conflita com RLS e adiciona camada pesada |
| Jobs | `pg_cron` + tabela `jobs` + Supabase Edge Functions / Vercel Cron | Inngest, Trigger.dev | Bons, mas desnecessários no volume de 1 usuário; podem entrar depois |
| Agente local | Python 3 (reaproveita motor PRF), executado pelo Agendador de Tarefas do Windows | Node no PC | Já existe código Python testado com COM do Project |
| Documentos | Índice no banco + `drive_file_id` + link; texto extraído para busca (Postgres full-text, `portuguese`) | Copiar tudo para Storage | Custo e duplicidade |
| Busca | Full-text do PostgreSQL; `pgvector` só na Fase 10 | Elastic, Algolia | Custo/complexidade |
| Relatórios | Excel: `exceljs`; PDF: `@react-pdf/renderer` ou HTML→PDF | — | — |
| Hospedagem | Vercel | Cloudflare Pages, Render | Vercel é a referência para Next.js |
| IA | Camada própria sobre Vercel AI SDK, provedor configurável (Claude padrão) | Chamada direta ao fornecedor | Exigência de independência de fornecedor |

## 4. Estrutura de repositório proposta (monorepo)
```
centro-de-comando/
├─ apps/web/                 # Next.js (UI + API)
│  └─ src/{app,components,domain,services,lib}
├─ packages/
│  ├─ db/                    # migrations SQL, tipos gerados, seeds de domínio (sem dados fictícios)
│  ├─ integrations/          # um diretório por conector, nunca importando /domain de UI
│  └─ ai-gateway/            # Fase 10
├─ agente-local/             # Python: msproject, excel, indexador de pastas (+ testes pytest)
├─ docs/                     # README, ARCHITECTURE, DATABASE, INTEGRATIONS, SECURITY,
│                            # ROADMAP, CHANGELOG, DEPLOYMENT, REGRAS_DE_NEGOCIO, ADR/
└─ .github/workflows/        # testes e lint em cada push
```
**Local do repositório no PC:** fora de `DESKTOP-EMPRESA` (ex.: `C:\dev\centro-de-comando`) para não sincronizar `node_modules` no Drive. O GitHub é o backup do código.

## 5. Segurança (desde a Fase 2)
- Supabase Auth com **cadastro público desabilitado**, um único usuário proprietário, **MFA (TOTP)**.
- **RLS em todas as tabelas**: política `owner_id = auth.uid()`; a chave `service_role` fica só nos jobs servidor e no agente local (escopo mínimo, nunca no navegador nem no Git).
- Segredos em variáveis de ambiente da Vercel/Supabase; tokens OAuth de terceiros criptografados no banco (Supabase Vault).
- Auditoria: trigger genérico grava `antes/depois` em `auditoria` para tabelas de negócio.
- Backups: diários automáticos do Supabase (Pro) **+ exportação semanal `pg_dump` para o Google Drive** feita pelo agente local (funciona inclusive no plano gratuito).
- HTTPS obrigatório (padrão da Vercel); cabeçalhos de segurança (CSP, HSTS).

## 6. Decisões arquiteturais registradas (ADR iniciais)
| ADR | Decisão | Status |
|---|---|---|
| 001 | Pilha Next.js + Supabase + Vercel | Proposta |
| 002 | Agente local Python para MS Project/Excel | Proposta |
| 003 | Documentos por referência ao Drive, sem cópia | Proposta |
| 004 | MS Project é fonte oficial de cronograma; sistema só lê | Proposta |
| 005 | Gravação externa desligada por padrão, por conector | Proposta |
| 006 | Todas as datas em `timestamptz`, exibição America/Sao_Paulo; valores em `numeric(14,2)` BRL | Proposta |
