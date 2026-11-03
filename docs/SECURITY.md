# Segurança

## Modelo de acesso
- **Um único usuário proprietário.** O id dele fica em `app.proprietario` (no máximo uma linha).
- O **cadastro público fica desativado** no Supabase Auth. O login usa e-mail com **MFA (TOTP) obrigatório**.
- **Todas as tabelas de `public` têm RLS ativo e forçado.** A política `proprietario_total` libera acesso só quando `app.is_proprietario()` é verdadeiro. Mesmo outro usuário autenticado, criado por engano, não lê nada (há teste para isso).
- O papel `anon` não tem privilégio em nenhuma tabela.
- As views usam `security_invoker`, então respeitam o RLS de quem consulta.
- `service_role` (ignora RLS) só é usada em jobs do servidor e no agente local. **Nunca no navegador.**

## Segredos
| Regra | Como é garantida |
|---|---|
| Nenhum segredo no código ou no GitHub | `.gitignore` bloqueia `.env*`, `*.key`, `credentials*.json`; varredura de segredos no CI (Fase 2) |
| Variáveis de ambiente | Vercel/Supabase; modelo em `.env.example` sem valores |
| Tokens OAuth de terceiros | Supabase Vault; `conectores.credencial_ref` guarda só o nome do segredo |
| Agente local | chave em arquivo fora do repositório, protegido por permissão de usuário do Windows |

## Auditoria
- O trigger `app.registrar_auditoria()` grava `INSERT/UPDATE/DELETE` com o antes e o depois, o usuário e o papel em `app.auditoria`. Fica fora da API pública.
- As execuções de sincronização ficam registradas em `sync_execucoes`/`sync_itens`.

## Backups e recuperação
| Mecanismo | Frequência | Fase |
|---|---|---|
| `pg_dump` pelo agente local → pasta no Google Drive | semanal (diário depois da Fase 5) | 2 |
| Backup diário gerenciado (Supabase Pro) | diário, retenção de 7 dias | 5 |
| Teste de restauração em banco descartável | antes da implantação final | 11 |

## Transporte e aplicação
- HTTPS obrigatório (Vercel), com HSTS.
- Cabeçalhos: CSP, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Validação de toda entrada no servidor (zod).
- Dependências verificadas no CI (`npm audit`).

## Dados sensíveis fora do escopo inicial
Os documentos financeiros da empresa (L7-BALANÇO, extratos, parcelamentos) **não são indexados** até haver decisão explícita do proprietário.

## Como reportar ou corrigir um problema de segurança
Registre um ADR com a correção. Se algum segredo vazar: revogue-o na origem **primeiro** e só depois limpe o histórico.
