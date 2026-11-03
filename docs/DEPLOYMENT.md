# ImplantaÃ§Ã£o

## Ambientes
| Ambiente | Banco | App | Uso |
|---|---|---|---|
| Teste automatizado | PGlite em memÃ³ria | â€” | `npm test` em cada commit (local e CI) |
| ProduÃ§Ã£o | Supabase, projeto Ãºnico em `sa-east-1` | Vercel, branch `main` | uso real |
| PrÃ©via | mesmo Supabase, sem escrita externa | Vercel Preview (branches) | revisar telas antes de publicar (Fase 3) |

## O que jÃ¡ estÃ¡ pronto no repositÃ³rio (Fase 2)
- `supabase/config.toml`: cadastro pÃºblico desligado, senha mÃ­nima de 12 caracteres com maiÃºscula, minÃºscula, nÃºmero e sÃ­mbolo, troca de senha com reautenticaÃ§Ã£o, MFA TOTP habilitado e seed desligado (sem dados fictÃ­cios).
- `supabase/migrations/0001â€¦0011`, com o esquema completo e o endurecimento.
- CI com testes do banco, testes do agente local, `npm audit`, varredura de segredos (gitleaks) e Dependabot.
- `agente-local/cc_agente/backup.py`, o backup `pg_dump` com retenÃ§Ã£o.

## Passo a passo da primeira implantaÃ§Ã£o

### A. Contas (feito pelo proprietÃ¡rio)
1. **Supabase**: em https://supabase.com, entrar com o GitHub e criar o projeto `centro-de-comando` na regiÃ£o **South America (SÃ£o Paulo)**, plano Free. **Guardar a senha do banco num gerenciador de senhas.** Ela nÃ£o deve ser enviada a ninguÃ©m, nem ao assistente.
2. **Vercel**: em https://vercel.com/signup, entrar com o GitHub, plano Hobby. O projeto Ã© ligado ao repositÃ³rio na Fase 3, quando existir a aplicaÃ§Ã£o web.

### B. Ligar o repositÃ³rio ao projeto Supabase âœ… feito em 03/11/2026
Projeto `maocgnsdhozsyrbxvqvr`, regiÃ£o `sa-east-1`.
```bash
npx.cmd supabase login
npx.cmd supabase link --project-ref <ref-do-projeto>
npx.cmd supabase db push --remote --dry-run
npx.cmd supabase db push --remote
```
- No Windows PowerShell use `npx.cmd`, porque a polÃ­tica de execuÃ§Ã£o bloqueia o `npx.ps1`.
- `login` abre o navegador para autorizar. O CLI v3 usa esse login tambÃ©m no `link` e no `db push`, sem pedir a senha do banco.
- O `<ref>` aparece na URL do painel: `supabase.com/dashboard/project/<ref>`.
- Sem `--remote`, o CLI v3 tenta um banco local (Docker). Sempre simule com `--dry-run` antes de aplicar.
- VerificaÃ§Ã£o feita depois da aplicaÃ§Ã£o: 29 tabelas, todas com RLS ativo e forÃ§ado, e 5 views. Uma requisiÃ§Ã£o anÃ´nima Ã  API recebe `permission denied`.

### C. UsuÃ¡rio proprietÃ¡rio
1. No painel Supabase, em **Authentication â†’ Users â†’ Add user â†’ Create new user**, informe o seu e-mail e uma senha forte e marque *Auto Confirm User*.
2. Em **Authentication â†’ Sign In / Providers**, confirme que *Allow new users to sign up* estÃ¡ **desligado**.
3. No **SQL Editor**, registre o proprietÃ¡rio. Ã‰ seguro executar, porque sÃ³ aceita uma linha:
   ```sql
   insert into app.proprietario (user_id)
   select id from auth.users where email = '<seu e-mail>';
   ```
4. A inscriÃ§Ã£o no MFA (app autenticador) acontece no primeiro login pela aplicaÃ§Ã£o (Fase 3).

### D. Backup semanal (agente local)
1. Instale as ferramentas cliente do PostgreSQL 17 (`pg_dump`).
2. Crie `%USERPROFILE%\.centro-de-comando\agente.env`, **fora do repositÃ³rio**. NÃ£o use `AppData`: aplicativos empacotados, como o Claude desktop, gravam ali numa cÃ³pia virtualizada que as outras janelas nÃ£o enxergam.
   ```
   SUPABASE_DB_URL=postgresql://postgres.<ref>@<host-do-pooler>:5432/postgres
   SUPABASE_DB_PASSWORD=<senha exatamente como gerada>
   BACKUP_DIR=C:\Users\<usuÃ¡rio>\Desktop\DESKTOP-EMPRESA\CENTRO_DE_COMANDO_GERENCIAL\BACKUPS
   BACKUP_MANTER=8
   ```
   A URL fica em **Project Settings â†’ Database â†’ Connection string â†’ Session pooler**. Use a porta 5432.
3. Teste manualmente executando `agente-local\backup.cmd`. Em 03/11/2026 o resultado foi um backup de 146 KB, conferido com `pg_restore --list`: 31 tabelas, 5 views, 29 polÃ­ticas e 56 triggers.
4. Agende no Windows. O proprietÃ¡rio roda este comando numa janela prÃ³pria do PowerShell, porque Ã© uma configuraÃ§Ã£o permanente do PC:
   ```powershell
   Register-ScheduledTask -TaskName 'Centro de Comando - Backup semanal' -Action (New-ScheduledTaskAction -Execute 'C:\dev\centro-de-comando\agente-local\backup.cmd') -Trigger (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 08:00) -Settings (New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries)
   ```
   `StartWhenAvailable` faz o backup rodar assim que o PC for ligado, se ele estava desligado na segunda Ã s 08:00. O registro de cada execuÃ§Ã£o fica em `%USERPROFILE%\.centro-de-comando\backup.log`.

### E. Publicar a aplicaÃ§Ã£o web na Vercel (Fase 3)
1. Em https://vercel.com/new, importe o repositÃ³rio `centro-de-comando` do GitHub.
2. **Root Directory:** `apps/web`. Mantenha *Include files outside the root directory* ligado. O tipo de projeto fica fixado em Next.js por `apps/web/vercel.json`. Sem esse arquivo, a Vercel pode detectar Python por causa do `agente-local/pyproject.toml`, e o build falha com `PYTHON_ENTRYPOINT_NOT_FOUND`.
3. **Environment Variables** (Production e Preview). Os dois valores sÃ£o pÃºblicos por natureza, porque os dados sÃ£o protegidos pelo RLS:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = chave **publishable** (Supabase â†’ Project Settings â†’ API Keys)
   - A `SUPABASE_SERVICE_ROLE_KEY` **nÃ£o** Ã© usada pela aplicaÃ§Ã£o web e nunca recebe o prefixo `NEXT_PUBLIC_`.
4. Clique em **Deploy** e anote o endereÃ§o `https://<projeto>.vercel.app`.
5. No Supabase, em **Authentication â†’ URL Configuration**: *Site URL* = o endereÃ§o da Vercel; em *Redirect URLs*, adicione esse mesmo endereÃ§o e `http://localhost:3000`.
6. Primeiro acesso: e-mail e senha, depois leia o QR code com o app autenticador e digite o cÃ³digo.
7. Instalar como aplicativo: no Chrome/Edge do PC, use o Ã­cone de instalar na barra de endereÃ§o. No celular, use *Adicionar Ã  tela inicial*.

### F. Desenvolvimento local da aplicaÃ§Ã£o
```bash
npm install
npm run dev
```
Requer `apps/web/.env.local` com as duas variÃ¡veis acima. O arquivo Ã© ignorado pelo Git. Depois de mudar o esquema do banco, regenere os tipos com `npx.cmd supabase gen types typescript --project-id <ref> --schema public > apps/web/src/lib/database.types.ts`.

## Fluxo de trabalho no Git
- `main` estÃ¡ sempre publicÃ¡vel. Cada fase ou recurso fica em `fase-N/<assunto>` e entra por Pull Request com o CI verde.
- Commits no padrÃ£o `tipo(escopo): descriÃ§Ã£o` (`feat`, `fix`, `docs`, `db`, `test`, `chore`).
- Toda mudanÃ§a de esquema vem acompanhada de: migration nova, testes, dicionÃ¡rio regenerado e entrada no CHANGELOG.

## ReversÃ£o
- App: *Instant Rollback* da Vercel.
- Banco: migration de reversÃ£o nova, nunca ediÃ§Ã£o da migration aplicada. Em caso grave: `pg_restore` do Ãºltimo backup num projeto novo, conferÃªncia, depois troca.
