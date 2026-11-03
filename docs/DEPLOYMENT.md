# Implantação

> A infraestrutura é criada na **Fase 2**. Este documento descreve o procedimento-alvo e será completado à medida que cada etapa for executada.

## Ambientes
| Ambiente | Banco | App | Uso |
|---|---|---|---|
| Teste automatizado | PGlite em memória | — | `npm test` em cada commit (local e CI) |
| Produção | Supabase (projeto único) | Vercel (branch `main`) | uso real |
| Prévia | mesmo Supabase, sem escrita externa | Vercel Preview (branches) | revisar telas antes de publicar |

## Pré-requisitos (feitos pelo proprietário)
1. Conta GitHub e repositório privado `centro-de-comando`.
2. Conta Supabase, com o projeto criado na região `sa-east-1` (São Paulo).
3. Conta Vercel ligada ao GitHub.
4. No Supabase Auth: desativar *Allow new users to sign up*, criar o usuário proprietário e ativar MFA.

## Procedimento (Fase 2)
1. `npx supabase link --project-ref <ref>`
2. Aplicar as migrations: `npx supabase db push`. Na versão inicial elas vêm de `packages/db/migrations`.
3. Registrar o proprietário: `insert into app.proprietario (user_id) values ('<uuid do usuário>');`
4. Ajustar o fuso padrão: `alter role authenticated set timezone = 'America/Sao_Paulo';`
5. Configurar as variáveis de ambiente na Vercel (ver `.env.example`).
6. Fazer push na `main`. A Vercel publica automaticamente.
7. Agendar o backup `pg_dump` no Agendador de Tarefas do Windows (agente local).

## Fluxo de trabalho no Git
- `main` está sempre publicável. Cada fase ou recurso fica em `fase-N/<assunto>` e entra por Pull Request.
- Commits no padrão `tipo(escopo): descrição` (`feat`, `fix`, `docs`, `db`, `test`, `chore`).
- Toda mudança de esquema vem acompanhada de: migration nova, testes, dicionário regenerado e entrada no CHANGELOG.

## Reversão
- App: *Instant Rollback* da Vercel para o deploy anterior.
- Banco: migration de reversão nova, nunca edição da migration aplicada. Em caso grave, restaurar o backup.
