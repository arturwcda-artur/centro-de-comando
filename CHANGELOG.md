# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Datas em America/Sao_Paulo.

## [0.12.5] — 2026-11-05 — Painel sem posições
### Alterado
- A tela **Equipe** deixa de ter ranking: ordena pelas entregas, sem posições, e mostra Resolvidas, Pendentes e No prazo. A taxa de resolução saiu da tela.
- **No prazo** passa a ser um saldo com sinal: cartões no prazo menos atrasados. O percentual fica em Prazos e tempos.

## [0.12.4] — 2026-11-05 — Crédito dividido
### Alterado
- A tarefa resolvida conta para quem marcou no Trello, item ou cartão. A pendente é dividida entre os responsáveis do cartão.
- A soma das pessoas passa a bater com o total da equipe. Migration `0026_cartao_concluido_por.sql`.

## [0.12.3] — 2026-11-05 — Tela Equipe mais simples
### Alterado
- O crédito dos itens volta ao responsável pelo cartão. Quem marcou continua guardado para uso futuro.
- Sem responsável fica no fim do ranking e fora dos totais e das listas.
- O ranking mostra só tarefas, resolvidas, pendentes, resolução e no prazo. Por lista, prazos e tempos ficam em seções recolhidas.

## [0.12.2] — 2026-11-05 — Ajustes
### Corrigido
- O cartão do Google Drive mostra erro de autorização quando falta a permissão, em vez de Conectado.

### Alterado
- Tela **Equipe**: cada item de checklist vale 1, e o cartão sem checklist vale 1, em **Sob responsabilidade**, **Resolvidas** e **Pendentes**. O ranking passa a seguir a **taxa de resolução** (RN-49c).
- Cartão de rotina agora só fica fora da eficiência no prazo.
- O item resolvido conta para quem o marcou no Trello. Migration `0025_item_resolvido_por.sql`.

## [0.12.1] — 2026-11-05 — Cartões de rotina
### Adicionado
- Botão **Marcar como rotina** no detalhe do cartão (RN-49b). O cartão sai da taxa de eficiência e das contagens.
- Tela **Equipe**: colunas **Itens de rotina** e **Tempo por item**.
- Migration `0024_cartoes_rotina.sql`.
## [0.12.0] — 2026-11-05 — Fase 8: documentos
### Adicionado
- Tela **Documentos**: busca por nome e conteúdo, filtros e abertura pelo Google Drive (ADR 0018).
- Agente indexa a pasta da obra sem alterar nada e entra no atalho e na rotina semanal.
- O sincronizador liga cada documento ao Drive, lendo só os dados dos arquivos.
- Migration `0023_documentos_indice.sql`.
- A tela Integrações mostra o espaço usado no banco.

## [0.11.2] — 2026-11-05 — Todas as tarefas
### Adicionado
- A tela Tarefas abre em **Todas**, com a equipe inteira, e ganha filtros por quadro e por responsável. Os cartões de outros membros só apareciam em Críticas e Vencimentos.
- Responsáveis aparecem na lista de tarefas, e cada nome do ranking da Equipe abre os cartões da pessoa.

### Corrigido
- Resultados da busca agora abrem a tarefa e a obra.

## [0.11.1] — 2026-11-05 — Eficiência da equipe
### Alterado
- A tela **Equipe** troca o percentual concluído pela **taxa de eficiência** e pelo **tempo médio de conclusão**, com a base do cálculo (RN-49a).
- A eficiência usa a primeira data de entrega, e a coluna **Prazos alterados** mostra cada mudança.
- Ranking por responsável e por lista, da maior para a menor eficiência.
- A data de conclusão passa a vir do histórico do Trello. Migration `0022_trello_datas.sql`.

## [0.11.0] — 2026-11-05 — Equipe e detalhes do Trello
### Adicionado
- Tela **Equipe**: cartões por lista e por responsável no quadro Obras do Grupo - C.SALLES, com filtro de período (ADR 0017).
- Membros, checklists e comentários dos cartões desse quadro no detalhe da tarefa.
- **Transformar em cartão**: cria um cartão novo no Trello a partir de um comentário, sem alterar a origem.
- Migration `0021_trello_equipe.sql`.

## [0.10.0] — 2026-11-04 — Fase 7: contratos e financeiro
### Adicionado
- Tela **Contratos e financeiro**: contrato, aditivos, medições, saldo por serviço e lançamentos (ADR 0016).
- Agente lê as medições item por item da planilha, em modo somente leitura. O atalho atualiza cronogramas e medições.
- Migration `0020_medicoes_itens.sql`: serviços do contrato, itens das medições, saldo por serviço e importação em uma transação.

### Alterado
- O valor anterior da Curva S passa a vir das medições aprovadas, quando houver.
- O aviso de total do Planejamento compara com o valor contratado, incluindo aditivos aprovados.

## [0.9.0] — 2026-11-04 — Fase 6: planejamento
### Adicionado
- Agente local lê os cronogramas do MS Project em modo somente leitura, com o atalho **Atualizar cronogramas** (ADR 0015).
- Tela **Planejamento**: resumo de prazo, Curva S em reais, atividades com filtros, arquivos e versões.
- Migration `0019_cronogramas.sql`: arquivos acompanhados, custo das atividades, importação em uma transação e papel restrito `agente_cronograma`.
- A linha de base só muda por decisão do proprietário (RN-68).

## [0.8.0] — 2026-11-04 — Fase 5: controle da agenda
### Adicionado
- **Novo compromisso**, edição e exclusão na tela Agenda, gravando no Google Agenda (ADR 0014, RN-67). Em evento recorrente, vale só para a data escolhida.
- Botão **Conectar Google** em Integrações, com autorização pelo Google.
- Migration `0018_google_agenda.sql`: token do Google no cofre do Supabase e registro de criar, alterar e excluir.
- Página pública `/privacidade`, exigida pelo Google para publicar o app. É a única sem login e não mostra dados do sistema.

### Alterado
- Depois de conectado, a agenda é lida pela API oficial do Google. As cópias do iCal saem das telas sem ser apagadas.

## [0.7.1] — 2026-11-04 — Origem das tarefas
### Adicionado
- Etiqueta **Trello** ou **Notion** em cada tarefa importada, com quadro e lista, e filtro por origem na tela Tarefas.

### Segurança
- O sincronizador deixa de importar cartões com credencial escrita no título ou na descrição (RN-66).

## [0.7.0] — 2026-11-04 — Fase 5: concluir tarefas na origem
### Adicionado
- Concluir tarefas próprias do Trello e do Notion pelo sistema, em Meu dia, Tarefas e no detalhe da tarefa (ADR 0013, RN-48). Cartões de terceiros seguem só leitura; nada é excluído na origem.
- Migration `0017_operacoes_externas.sql`: registro de cada gravação externa e autorização de escrita.
- Sincronização não altera mais o modo do conector.
- Decisão de hospedagem registrada: fica na Vercel, após teste da Cloudflare.

## [0.6.1] — 2026-11-04 — Listas de credenciais fora do sistema
### Segurança
- O sincronizador deixa de importar listas do Trello ligadas a credenciais (RN-66).
- Migration `0016_remover_listas_sensiveis.sql`: remove do banco e da auditoria as cópias da lista "Senhas apps", importadas na primeira sincronização. Autorizado pelo proprietário; os cartões seguem intactos no Trello. É a única exceção à imutabilidade da auditoria.

## [0.6.0] — 2026-11-03 — Fase 5, etapa B: conectores somente leitura
### Adicionado
- `packages/integrations`: motor de sincronização idempotente (hash + upsert por fonte e id externo, execuções registradas) e conectores **Trello** (API), **Google Agenda** (iCal, com recorrências) e **Notion** (Central de Gestão).
- Workflow `sincronizar.yml` no GitHub Actions: a cada hora, mais o botão "Run workflow" para sincronizar na hora.
- Tela **Integrações**: estado de cada conector, última e próxima sincronização e as últimas execuções com contagens e erros.
- Migration `0015_eventos_cancelados.sql`: eventos cancelados na origem saem das telas sem ser apagados.
- 13 testes dos conectores (recorrência com EXDATE e exceção, fuso, dia inteiro, mapeamentos, idempotência).

## [0.5.0] — 2026-11-03 — Fase 5, etapa A: Tarefas, Meu dia e Agenda
### Adicionado
- **Tarefas**: cadastro, edição, conclusão e reabertura, com as 6 visões da RN-45 (minhas, aguardando terceiros, cobranças, críticas, vencimentos e concluídas), filtro por obra e escore visível.
- **Meu dia**: captura rápida de tarefa, foco do dia com o motivo da prioridade (RN-46), compromissos de hoje, cobranças, aguardando terceiros e vencimentos dos próximos 7 dias.
- **Agenda**: próximos 14 dias agrupados por dia, no horário de São Paulo.
- Cadastro de pessoas com a opção "Sou eu".
- Migration `0014_tarefas_minhas.sql`, com 2 testes do banco (total: 31). Testes web: 29.
- ADR 0012: conectores gratuitos (iCal, API do Trello, integração do Notion, GitHub Actions).

## [0.4.0] — 2026-11-03 — Fase 4: Cadastro e gestão de obras
### Adicionado
- **Obras**: lista com filtro por situação, cadastro, edição e arquivamento. Ambiente individual da obra com as abas Visão geral, Riscos e Decisões; as abas das fases 5 a 8 aparecem marcadas.
- **Importação assistida** (RN-05 a RN-09): o agente lê as pastas e gera propostas, que o proprietário aprova, corrige ou descarta. A aprovação é atômica (`aprovar_importacao_obra`).
- **Cadastros**: empresas, contratantes, pessoas e fornecedores, com arquivamento.
- **Riscos e decisões**: registro por obra, troca rápida de situação, matriz 5×5 consolidada e lista de decisões pendentes.
- Validação de todos os formulários no servidor (zod), com mensagens por campo e tradução dos erros do banco.
- Migration `0013_importacao_obras.sql` e 7 testes do banco (total: 29).
- `cc_agente.inventario_obras` e 7 testes (total do agente: 18). Testes web: 24.
- Módulo **Cadastros** no menu; o selo "F" agora só aparece em módulos de fases futuras.

## [0.3.0] — 2026-11-03 — Fase 3: Dashboard e navegação
### Adicionado
- Aplicação Next.js 16 em `apps/web` (React 19, TypeScript, Tailwind 4), em português e no fuso de São Paulo.
- Login com e-mail e senha e **segundo fator obrigatório** (TOTP): cadastro com QR code e verificação a cada login.
- `proxy.ts` com as regras de acesso numa função pura testada, mais revalidação no servidor (`exigirSessaoCompleta`).
- Migration `0012_exigir_mfa.sql`: o banco só libera dados para sessões `aal2` (ADR 0011).
- Layout com menu lateral agrupado (gaveta no celular), busca global (Ctrl+K) em obras, tarefas e documentos, e páginas de cada módulo indicando a fase de entrega.
- Painel executivo sobre as views: obras (total, andamento, planejamento, próximas da conclusão, com atraso), atividades vencidas, riscos críticos, carteira financeira, prioridades, compromissos de hoje, vencimentos, decisões pendentes e obras com atraso. Filtros por obra e período.
- PWA instalável: manifest, ícones e service worker que não guarda dados em cache.
- Cabeçalhos de segurança: CSP, HSTS, `X-Frame-Options`, `noindex`.
- 14 testes da aplicação web e 22 do banco. Novo job de CI: tipos, lint, testes e build.
- ADRs 0010 (sem `cacheComponents`) e 0011 (MFA no banco).

## [0.2.0] — 2026-11-03 — Fase 2: Infraestrutura e segurança (preparação)
### Adicionado
- Projeto Supabase CLI (`supabase/config.toml`): cadastro público desligado, política de senha forte, MFA TOTP, seed desligado.
- Migration `0011_endurecimento.sql`: fuso America/Sao_Paulo nas sessões da API, `search_path` fixo nas funções, auditoria imutável (bloqueia UPDATE, DELETE e TRUNCATE), schema `app` inacessível pela API.
- 4 novos testes de segurança, totalizando 21.
- Agente local: `cc_agente.backup` (pg_dump com retenção, senha por variável de ambiente, arquivo parcial nunca vira backup) e 10 testes pytest.
- CI: testes do agente local, `npm audit`, varredura de segredos (gitleaks); Dependabot semanal.
- DEPLOYMENT.md com o passo a passo da primeira implantação.

### Alterado
- Migrations movidas de `packages/db/migrations` para `supabase/migrations`, a pasta padrão do Supabase CLI.

### Implantado
- Projeto Supabase `maocgnsdhozsyrbxvqvr` (sa-east-1) com as migrations 0001 a 0011 aplicadas. O acesso anônimo à API foi verificado como bloqueado.

- Usuário proprietário criado e registrado em `app.proprietario`.
- Backup testado: `pg_dump` 17.11, dump de 146 KB conferido com `pg_restore --list`.
- `agente-local/backup.cmd` para o Agendador de Tarefas. A configuração fica em `%USERPROFILE%\.centro-de-comando` (fora de AppData, que é virtualizado para apps MSIX), e a senha vai em campo separado (`SUPABASE_DB_PASSWORD`).

- Tarefa "Centro de Comando - Backup semanal" registrada no Agendador de Tarefas: segundas às 08:00, com execução assim que possível se o horário foi perdido.

## [0.1.0] — 2026-11-03 — Fase 1: Arquitetura e modelagem
### Adicionado
- Repositório monorepo (`apps/`, `packages/`, `agente-local/`, `docs/`).
- Documentação permanente: README, ARCHITECTURE, DATABASE, INTEGRATIONS, SECURITY, DEPLOYMENT, ROADMAP, REGRAS_DE_NEGOCIO, dicionário de dados gerado automaticamente.
- ADRs 0001–0009.
- 10 migrations SQL: 29 tabelas e 5 views, com RLS para proprietário único, auditoria por trigger e bloco de origem com idempotência `(fonte, id_externo)`.
- 17 testes automatizados do modelo, rodando em PostgreSQL descartável (PGlite).
- CI no GitHub Actions rodando os testes a cada push.

## [0.0.1] — 2026-11-03 — Fase 0: Auditoria
### Adicionado
- Oito documentos de diagnóstico em `docs/fase-0`.
