# Fase 6 — Planejamento: plano de implementação

> Execução: em linha nesta sessão, tarefa por tarefa, com teste antes do código.

**Objetivo:** ler os cronogramas do MS Project em modo somente leitura, guardar as versões e mostrar prazo, atividades e Curva S na tela Planejamento.

**Arquitetura:** o agente local lê os `.mpp` por COM e chama funções do banco com um papel restrito. A aplicação web lê as tabelas e calcula a Curva S em uma função pura.

**Tecnologia:** PostgreSQL (Supabase), Python 3.14 com `pywin32` e `psycopg`, Next.js 16.

**Especificação:** `docs/superpowers/specs/2026-11-04-fase-6-planejamento-design.md`

## Restrições gerais
- Nenhum `.mpp` é salvo ou alterado (RN-65).
- Interface em pt-BR, datas em America/Sao_Paulo, valores em R$.
- Toda tabela nova chama `app.aplicar_padroes`.
- Nenhum segredo no repositório.
- Migrations só vão para produção com autorização do proprietário.

## Tarefa 1 — Banco
**Arquivos:** `supabase/migrations/0019_cronogramas.sql`, `packages/db/tests/cronogramas.test.js`

**Produz:**
- Tabela `cronograma_arquivos`, colunas `atividades_cronograma.custo` e `cronograma_versoes.arquivo_id`.
- Papel `agente_cronograma`, sem login até o proprietário definir a senha.
- `listar_cronogramas_agente()`: arquivos a ler (`id`, `caminho`, `ultimo_hash`).
- `importar_cronograma(payload jsonb) returns text`: devolve `criada` ou `igual`.
- `registrar_erro_cronograma(p_arquivo uuid, p_erro text)`.
- `tornar_linha_base(p_versao uuid)`: só o proprietário.
- View `cronograma_realizado`: `versao_id`, `obra_id`, `data_leitura`, `total`, `realizado`.
- Cadastro dos 4 arquivos da PRF-Recanto a partir de `obras.pasta_local`.

**Testes:** importação idempotente, troca de vigente, retorno a um arquivo anterior, linha de base preservada, transação sem carga parcial, marco contratual e limites do papel.

## Tarefa 2 — Agente
**Arquivos:** `agente-local/cc_agente/cronogramas.py`, `agente-local/tests/test_cronogramas.py`, `agente-local/atualizar-cronogramas.cmd`

**Consome:** as três funções do banco para o agente.

**Produz:** `sha256_arquivo(caminho)`, `data_iso(valor)`, `ler_projeto(app, caminho)`, `processar(arquivos, banco, abrir_project, project_aberto, ler)` e `main()`.

**Testes:** hash igual não abre o Project, `ND`/`NA`, Project já aberto, arquivo ausente, falha isolada e mapeamento dos tipos de dependência.

## Tarefa 3 — Curva S
**Arquivos:** `apps/web/src/lib/curva-s.ts`, `apps/web/src/lib/curva-s.test.ts`

**Produz:** `valorAcumulado(atividades, data, partida)`, `serieSemanal(atividades, partida)` e `atrasada(atividade, hoje)`.

**Testes:** distribuição por dias, partida no valor anterior, atividade de um dia, resumo ignorado e atrasadas.

## Tarefa 4 — Tela
**Arquivos:** `apps/web/src/app/(app)/planejamento/page.tsx`, `apps/web/src/app/(app)/planejamento/[id]/page.tsx`, `.../[id]/acoes.ts`, `.../[id]/formularios.tsx`, `apps/web/src/components/grafico-curva-s.tsx`, `apps/web/src/lib/validacao.ts`, `apps/web/src/lib/navegacao.ts`, `apps/web/src/lib/database.types.ts`

**Consome:** tabelas da Tarefa 1 e funções da Tarefa 3.

**Testes:** validação do valor executado e compilação das rotas.

## Tarefa 5 — Documentação e entrega
**Arquivos:** ADR 0015, `docs/DATABASE.md`, `docs/INTEGRATIONS.md`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `docs/REGRAS_DE_NEGOCIO.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `agente-local/README.md`, `CHANGELOG.md`, dicionário de dados.

**Verificação:** todos os testes, lint, compilação e PR. O teste real vem depois da migration e da senha do agente.
