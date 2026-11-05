# Plano de recuperação

## O que está em cada lugar

| Item | Onde fica | Está no backup? |
|---|---|---|
| Dados do sistema e auditoria | Supabase, schemas `public` e `app` | Sim |
| Código e histórico | GitHub | Não precisa |
| Login, senha e segundo fator | Supabase, schema `auth` | **Não**: refazer |
| Autorização do Google | Supabase, Vault | **Não**: usar Reconectar Google |
| Autorização do Claude | Supabase, OAuth | **Não**: conectar de novo |
| Chaves de Trello, Notion e Supabase | GitHub Secrets e Vercel | **Não**: cadastrar de novo |
| Senhas do agente | `C:\Users\Arthur\.centro-de-comando\agente.env` | **Não**: guardar no gerenciador de senhas |
| Arquivos das obras | Pastas e Google Drive | Fora do sistema |

Os backups ficam em `DESKTOP-EMPRESA\CENTRO_DE_COMANDO_GERENCIAL\BACKUPS`. Os 8 mais recentes são mantidos. Eles têm dados da empresa: não envie a ninguém.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| Sistema fora do ar | Veja a Vercel. Em **Deployments**, use **Promote** na última versão boa |
| Conector com erro em Integrações | Clique em **Sincronizar agora** e veja a mensagem |
| Erro de autorização no Google | Em Integrações, use **Reconectar Google** |
| Erro de autorização no Trello ou no Notion | Gere uma chave nova e atualize no GitHub e na Vercel |
| Cronograma, medição ou pastas sem leitura | Ligue o computador e use o atalho "Atualizar cronogramas" |
| Assistente sem responder | Em Integrações, confira a autorização e conecte de novo no Claude |
| E-mail do GitHub com falha em `conferir-producao` | Abra a falha no GitHub e veja qual item parou |
| Supabase pausado | Entre no painel e clique em **Restore** |

## Perda de dados no banco

Não apague nada antes de pedir ajuda. Peça ao Claude para conduzir estes passos:

1. Guarde uma cópia do backup escolhido.
2. Se o projeto antigo não existir mais, crie outro no plano Free, em São Paulo.
3. Entre no sistema uma vez e cadastre o segundo fator.
4. Restaure o backup com `pg_restore --no-owner --no-privileges`.
5. Se o usuário mudou, ajuste `app.proprietario` para o novo identificador.
6. Atualize as chaves na Vercel e no GitHub, se o projeto mudou.
7. Em Integrações, reconecte o Google. No Claude, conecte de novo.
8. Rode a sincronização e confira as telas pelo [roteiro](ROTEIRO_DE_CONFERENCIA.md).

## O que já foi testado

Em 05/11/2026, o backup foi carregado em um PostgreSQL em memória: 45 tabelas, 10.146 linhas, 59 chaves estrangeiras e 43 políticas, sem diferença de linhas para a nuvem. A recuperação completa em um projeto novo do Supabase, passos 2 a 7, não foi ensaiada.
