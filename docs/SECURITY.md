# Segurança

## Modelo de acesso
- **Um único usuário proprietário.** O id dele fica em `app.proprietario` (no máximo uma linha).
- O **cadastro público fica desativado** no Supabase Auth. O login usa e-mail com **MFA (TOTP) obrigatório**.
- **Todas as tabelas de `public` têm RLS ativo e forçado.** A política `proprietario_total` libera acesso só quando `app.is_proprietario()` é verdadeiro. Mesmo outro usuário autenticado, criado por engano, não lê nada (há teste para isso).
- **O segundo fator é exigido em três camadas** (ADR 0011): o proxy da aplicação, o layout autenticado e o próprio banco. Uma sessão só com senha (`aal1`) não lê nem grava nada.
- O papel `anon` não tem privilégio em nenhuma tabela.
- As views usam `security_invoker`, então respeitam o RLS de quem consulta.
- `service_role` (ignora RLS) só é usada em jobs do servidor e no agente local. **Nunca no navegador.**

## Segredos
| Regra | Como é garantida |
|---|---|
| Nenhum segredo no código ou no GitHub | `.gitignore` bloqueia `.env*`, `*.key`, `credentials*.json`; varredura de segredos no CI (Fase 2) |
| Variáveis de ambiente | Vercel/Supabase; modelo em `.env.example` sem valores |
| Tokens OAuth de terceiros | Supabase Vault; `conectores.credencial_ref` guarda só o nome do segredo. A leitura exige proprietário com segundo fator ou a chave de serviço (ADR 0014) |
| Conexão com o Google | Só com sessão completa. Um valor aleatório em cookie protegido, conferido no retorno, impede que outro site conclua a conexão |
| Agente local | chave em arquivo fora do repositório, protegido por permissão de usuário do Windows |
| Agente de cronogramas e medições | Papel `agente_cronograma`, que só executa seis funções e não lê nenhuma tabela. A senha fica em `agente.env`, fora do repositório |
| Sincronizador (GitHub Actions) | `SUPABASE_SERVICE_ROLE_KEY` e os tokens/iCal só como *Actions secrets*. O workflow tem `permissions: contents: read`, e o código nunca imprime segredos nem URLs |

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

## Perda do celular com o autenticador
1. No painel do Supabase, vá em **Authentication → Users**, abra o seu usuário e remova o fator TOTP (*MFA factors*).
2. Entre de novo no sistema com e-mail e senha. Ele pede o cadastro de um novo autenticador.
3. Se suspeitar que a senha também vazou, troque-a antes.

## Como reportar ou corrigir um problema de segurança
Registre um ADR com a correção. Se algum segredo vazar: revogue-o na origem **primeiro** e só depois limpe o histórico.
