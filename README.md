# Centro de Comando Gerencial

Plataforma privada para gestão de obras e da rotina gerencial. Um único usuário, acesso pelo computador e pelo celular. Ela integra Trello, Google Agenda, Excel, MS Project, Notion e GitHub, sem substituir nenhum deles.

## Situação
| Fase | Estado |
|---|---|
| 0 — Auditoria e diagnóstico | ✅ concluída ([docs/fase-0](docs/fase-0)) |
| 1 — Arquitetura e modelagem de dados | ✅ aprovada |
| 2 — Infraestrutura na nuvem e segurança | ✅ aprovada |
| 3 — Dashboard e navegação | ✅ aprovada · https://centro-de-comando-chi.vercel.app |
| 4 — Cadastro e gestão de obras | ✅ entregue, aguardando aprovação |

Roteiro completo em [docs/ROADMAP.md](docs/ROADMAP.md).

## Estrutura
```
apps/web/              aplicação Next.js 16 (login + MFA, painel, navegação, PWA)
supabase/              config do Supabase CLI e migrations SQL
packages/db/           testes do modelo e gerador do dicionário
packages/integrations/ conectores, um por ferramenta (Fase 5 em diante)
agente-local/          agente Python para MS Project, Excel e pastas (Fase 6)
docs/                  documentação permanente e ADRs
```

## Como rodar os testes do banco
Requisitos: Node.js 22 ou superior.
```bash
npm install
npm test
```
Os testes aplicam todas as migrations num PostgreSQL descartável em memória (PGlite). Ele simula os papéis do Supabase e verifica RLS, auditoria, idempotência e as regras financeiras.

Para regenerar o dicionário de dados:
```bash
npm run dicionario -w @cc/db
```

## Documentação
- [ARCHITECTURE.md](docs/ARCHITECTURE.md): visão geral e camadas
- [DATABASE.md](docs/DATABASE.md): modelo, convenções, migrations ([dicionário](docs/DICIONARIO_DE_DADOS.md))
- [REGRAS_DE_NEGOCIO.md](docs/REGRAS_DE_NEGOCIO.md): cálculos e regras de gestão
- [INTEGRATIONS.md](docs/INTEGRATIONS.md): conectores e sincronização
- [SECURITY.md](docs/SECURITY.md): autenticação, RLS, segredos, backups
- [DEPLOYMENT.md](docs/DEPLOYMENT.md): implantação
- [ROADMAP.md](docs/ROADMAP.md) e [CHANGELOG.md](CHANGELOG.md)
- [docs/adr](docs/adr): decisões arquiteturais

## Princípio de condução
Antes de implementar qualquer recurso: verificar a arquitetura, o impacto no banco, as integrações afetadas e possíveis duplicidades; preservar o que já funciona; atualizar a documentação; testar. Toda decisão estrutural vira um ADR.
