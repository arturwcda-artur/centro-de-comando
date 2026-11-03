# Implantação

## Ambientes
| Ambiente | Banco | App | Uso |
|---|---|---|---|
| Teste automatizado | PGlite em memória | — | `npm test` em cada commit (local e CI) |
| Produção | Supabase, projeto único em `sa-east-1` | Vercel, branch `main` | uso real |
| Prévia | mesmo Supabase, sem escrita externa | Vercel Preview (branches) | revisar telas antes de publicar (Fase 3) |

## O que já está pronto no repositório (Fase 2)
- `supabase/config.toml`: cadastro público desligado, senha mínima de 12 caracteres com maiúscula, minúscula, número e símbolo, troca de senha com reautenticação, MFA TOTP habilitado e seed desligado (sem dados fictícios).
- `supabase/migrations/0001…0011`, com o esquema completo e o endurecimento.
- CI com testes do banco, testes do agente local, `npm audit`, varredura de segredos (gitleaks) e Dependabot.
- `agente-local/cc_agente/backup.py`, o backup `pg_dump` com retenção.

## Passo a passo da primeira implantação

### A. Contas (feito pelo proprietário)
1. **Supabase**: em https://supabase.com, entrar com o GitHub e criar o projeto `centro-de-comando` na região **South America (São Paulo)**, plano Free. **Guardar a senha do banco num gerenciador de senhas.** Ela não deve ser enviada a ninguém, nem ao assistente.
2. **Vercel**: em https://vercel.com/signup, entrar com o GitHub, plano Hobby. O projeto é ligado ao repositório na Fase 3, quando existir a aplicação web.

### B. Ligar o repositório ao projeto Supabase (proprietário digita as credenciais)
```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push
```
- `login` abre o navegador para autorizar.
- `link` pede a senha do banco. Ela é digitada pelo proprietário e não fica salva no repositório.
- O `<ref>` aparece na URL do painel: `supabase.com/dashboard/project/<ref>`.
- `db push` aplica as migrations 0001 a 0011.

### C. Usuário proprietário
1. No painel Supabase, em **Authentication → Users → Add user → Create new user**, informe o seu e-mail e uma senha forte e marque *Auto Confirm User*.
2. Em **Authentication → Sign In / Providers**, confirme que *Allow new users to sign up* está **desligado**.
3. No **SQL Editor**, registre o proprietário. É seguro executar, porque só aceita uma linha:
   ```sql
   insert into app.proprietario (user_id)
   select id from auth.users where email = '<seu e-mail>';
   ```
4. A inscrição no MFA (app autenticador) acontece no primeiro login pela aplicação (Fase 3).

### D. Backup semanal (agente local)
1. Instale as ferramentas cliente do PostgreSQL 17 (`pg_dump`).
2. Crie `%LOCALAPPDATA%\CentroDeComando\agente.env`, **fora do repositório**:
   ```
   SUPABASE_DB_URL=postgresql://postgres.<ref>:<senha>@<host-do-pooler>:5432/postgres
   BACKUP_DIR=C:\Users\<usuário>\Desktop\DESKTOP-EMPRESA\CENTRO_DE_COMANDO_GERENCIAL\BACKUPS
   BACKUP_MANTER=8
   ```
   A URL fica em **Project Settings → Database → Connection string → Session pooler**. Use a porta 5432.
3. Teste manualmente: `cd agente-local` e depois `py -m cc_agente.backup`.
4. Agende no **Agendador de Tarefas do Windows**: semanalmente, ação `py -m cc_agente.backup`, com início em `C:\dev\centro-de-comando\agente-local`.

### E. Variáveis de ambiente (Fase 3, Vercel)
Ver `.env.example`. A `SUPABASE_SERVICE_ROLE_KEY` nunca recebe o prefixo `NEXT_PUBLIC_`.

## Fluxo de trabalho no Git
- `main` está sempre publicável. Cada fase ou recurso fica em `fase-N/<assunto>` e entra por Pull Request com o CI verde.
- Commits no padrão `tipo(escopo): descrição` (`feat`, `fix`, `docs`, `db`, `test`, `chore`).
- Toda mudança de esquema vem acompanhada de: migration nova, testes, dicionário regenerado e entrada no CHANGELOG.

## Reversão
- App: *Instant Rollback* da Vercel.
- Banco: migration de reversão nova, nunca edição da migration aplicada. Em caso grave: `pg_restore` do último backup num projeto novo, conferência, depois troca.
