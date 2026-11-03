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

### B. Ligar o repositório ao projeto Supabase ✅ feito em 03/11/2026
Projeto `maocgnsdhozsyrbxvqvr`, região `sa-east-1`.
```bash
npx.cmd supabase login
npx.cmd supabase link --project-ref <ref-do-projeto>
npx.cmd supabase db push --remote --dry-run
npx.cmd supabase db push --remote
```
- No Windows PowerShell use `npx.cmd`, porque a política de execução bloqueia o `npx.ps1`.
- `login` abre o navegador para autorizar. O CLI v3 usa esse login também no `link` e no `db push`, sem pedir a senha do banco.
- O `<ref>` aparece na URL do painel: `supabase.com/dashboard/project/<ref>`.
- Sem `--remote`, o CLI v3 tenta um banco local (Docker). Sempre simule com `--dry-run` antes de aplicar.
- Verificação feita depois da aplicação: 29 tabelas, todas com RLS ativo e forçado, e 5 views. Uma requisição anônima à API recebe `permission denied`.

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
2. Crie `%USERPROFILE%\.centro-de-comando\agente.env`, **fora do repositório**. Não use `AppData`: aplicativos empacotados, como o Claude desktop, gravam ali numa cópia virtualizada que as outras janelas não enxergam.
   ```
   SUPABASE_DB_URL=postgresql://postgres.<ref>@<host-do-pooler>:5432/postgres
   SUPABASE_DB_PASSWORD=<senha exatamente como gerada>
   BACKUP_DIR=C:\Users\<usuário>\Desktop\DESKTOP-EMPRESA\CENTRO_DE_COMANDO_GERENCIAL\BACKUPS
   BACKUP_MANTER=8
   ```
   A URL fica em **Project Settings → Database → Connection string → Session pooler**. Use a porta 5432.
3. Teste manualmente executando `agente-local\backup.cmd`. Em 03/11/2026 o resultado foi um backup de 146 KB, conferido com `pg_restore --list`: 31 tabelas, 5 views, 29 políticas e 56 triggers.
4. Agende no Windows. O proprietário roda este comando numa janela própria do PowerShell, porque é uma configuração permanente do PC:
   ```powershell
   Register-ScheduledTask -TaskName 'Centro de Comando - Backup semanal' -Action (New-ScheduledTaskAction -Execute 'C:\dev\centro-de-comando\agente-local\backup.cmd') -Trigger (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 08:00) -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries)
   ```
   `StartWhenAvailable` faz o backup rodar assim que o PC for ligado, se ele estava desligado na segunda às 08:00. O registro de cada execução fica em `%USERPROFILE%\.centro-de-comando\backup.log`.

### E. Publicar a aplicação web na Vercel (Fase 3)
1. Em https://vercel.com/new, importe o repositório `centro-de-comando` do GitHub.
2. **Root Directory:** `apps/web`. Mantenha *Include files outside the root directory* ligado. O tipo de projeto fica fixado em Next.js por `apps/web/vercel.json`. Sem esse arquivo, a Vercel pode detectar Python por causa do `agente-local/pyproject.toml`, e o build falha com `PYTHON_ENTRYPOINT_NOT_FOUND`.
3. **Environment Variables** (Production e Preview). Os dois valores são públicos por natureza, porque os dados são protegidos pelo RLS:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = chave **publishable** (Supabase → Project Settings → API Keys)
   - A `SUPABASE_SERVICE_ROLE_KEY` **não** é usada pela aplicação web e nunca recebe o prefixo `NEXT_PUBLIC_`.
4. Clique em **Deploy** e anote o endereço `https://<projeto>.vercel.app`.
5. No Supabase, em **Authentication → URL Configuration**: *Site URL* = o endereço da Vercel; em *Redirect URLs*, adicione esse mesmo endereço e `http://localhost:3000`.
6. Primeiro acesso: e-mail e senha, depois leia o QR code com o app autenticador e digite o código.
7. Instalar como aplicativo: no Chrome/Edge do PC, use o ícone de instalar na barra de endereço. No celular, use *Adicionar à tela inicial*.

### F. Desenvolvimento local da aplicação
```bash
npm install
npm run dev
```
Requer `apps/web/.env.local` com as duas variáveis acima. O arquivo é ignorado pelo Git. Depois de mudar o esquema do banco, regenere os tipos com `npx.cmd supabase gen types typescript --project-id <ref> --schema public > apps/web/src/lib/database.types.ts`.

## Fluxo de trabalho no Git
- `main` está sempre publicável. Cada fase ou recurso fica em `fase-N/<assunto>` e entra por Pull Request com o CI verde.
- Commits no padrão `tipo(escopo): descrição` (`feat`, `fix`, `docs`, `db`, `test`, `chore`).
- Toda mudança de esquema vem acompanhada de: migration nova, testes, dicionário regenerado e entrada no CHANGELOG.

## Reversão
- App: *Instant Rollback* da Vercel.
- Banco: migration de reversão nova, nunca edição da migration aplicada. Em caso grave: `pg_restore` do último backup num projeto novo, conferência, depois troca.
