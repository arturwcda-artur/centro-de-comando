# Banco de dados

PostgreSQL no Supabase. O esquema é definido só por migrations SQL versionadas em `supabase/migrations`, a pasta que o Supabase CLI aplica com `supabase db push`. Os testes ficam em `packages/db/tests` e leem as migrations dessa mesma pasta.

## Migrations
| Arquivo | Conteúdo |
|---|---|
| `0001_fundacao.sql` | schema `app`, proprietário único, `app.is_proprietario()`, `app.hoje()`, auditoria |
| `0002_cadastros.sql` | empresas, contratantes, pessoas, fornecedores |
| `0003_obras.sql` | obras, obra_participantes |
| `0004_contratos_financeiro.sql` | contratos, aditivos, medições, lançamentos financeiros |
| `0005_planejamento.sql` | versões de cronograma, atividades, dependências, marcos, avanço físico |
| `0006_gestao.sql` | tarefas, dependências de tarefas, eventos, reuniões, riscos, decisões |
| `0007_documentos.sql` | documentos (índice + busca), versões, anexos |
| `0008_integracoes_indicadores.sql` | conectores, execuções, itens, conflitos, fotografias de indicadores |
| `0009_seguranca.sql` | RLS, políticas, triggers de `atualizado_em` e auditoria em **todas** as tabelas |
| `0010_views.sql` | `v_contratos_resumo`, `v_obra_resumo`, `v_tarefas_priorizadas`, `v_vencimentos`, `v_riscos_criticos` |
| `0011_endurecimento.sql` | fuso das sessões da API, `search_path` fixo nas funções, auditoria imutável, `app` inacessível pela API |
| `0013_importacao_obras.sql` | propostas de obras lidas das pastas (`importacao_obras`) e `aprovar_importacao_obra()`, que cria a obra e marca a proposta numa só transação |
| `0017_operacoes_externas.sql` | registro das gravações nas ferramentas de origem e autorização de escrita no Trello e no Notion (ADR 0013) |
| `0018_google_agenda.sql` | funções do cofre de credenciais e operações criar, alterar e excluir (ADR 0014) |
| `0019_cronogramas.sql` | arquivos do MS Project acompanhados, custo das atividades, importação e papel `agente_cronograma` (ADR 0015) |
| `0020_medicoes_itens.sql` | serviços do contrato, itens das medições, saldo por serviço e importação (ADR 0016) |
| `0021_trello_equipe.sql` | membros, comentários e checklists do quadro detalhado, sem auditoria (ADR 0017) |
| `0022_trello_datas.sql` | criação e conclusão reais dos cartões do quadro detalhado (ADR 0017) |
| `0024_cartoes_rotina.sql` | marcação de cartões de rotina e datas dos itens de checklist (ADR 0017) |
| `0016_remover_listas_sensiveis.sql` | remove as cópias da lista de credenciais do Trello (RN-66) |
| `0015_eventos_cancelados.sql` | `eventos.cancelado_em`: evento removido ou cancelado na origem sai das telas sem ser apagado |
| `0014_tarefas_minhas.sql` | `v_tarefas_priorizadas.minha` inclui tarefas sem responsável (RN-45) |
| `0012_exigir_mfa.sql` | `app.is_proprietario()` exige o nível `aal2` (senha + código do autenticador), conforme o ADR 0011 |

**Regras para novas migrations**
1. Nunca editar uma migration já aplicada em produção. Toda mudança entra numa migration nova.
2. Toda tabela nova em `public` chama `select app.aplicar_padroes('public.<tabela>');` (RLS, política, auditoria, `atualizado_em`). O teste `todas as tabelas de public têm RLS` falha se isso for esquecido.
3. Toda view nova usa `with (security_invoker = on)`. Isso também é testado.
4. Depois de mudar o esquema, rode `npm run dicionario -w @cc/db`.

## Convenções
| Tema | Regra |
|---|---|
| Nomes | português, `snake_case`, tabelas no plural |
| Chave primária | `id uuid default gen_random_uuid()` (exceto logs volumosos: `bigint identity`) |
| Datas | `date` para datas civis; `timestamptz` para instantes; "hoje" = `app.hoje()` (America/Sao_Paulo) |
| Dinheiro | `numeric(14,2)` em R$; nunca `float` |
| Percentuais | `numeric(5,2)` de 0 a 100 |
| Domínios | `text` + `CHECK` (ver ADR 0008) |
| Exclusão | lógica (`arquivado_em`) nas entidades principais; FKs com `restrict` onde apagar perderia histórico |
| Auditoria | trigger `app.registrar_auditoria()` grava antes/depois em `app.auditoria` |

## Bloco de origem (dados importados)
As tabelas que recebem dados de outras ferramentas (`tarefas`, `eventos`, `reunioes`, `decisoes`, `documentos`, `medicoes`, `cronograma_versoes`) têm:

| Coluna | Uso |
|---|---|
| `fonte` | `manual`, `trello`, `google_agenda`, `notion`, `msproject`, `excel`, `google_drive`... |
| `id_externo` | identificador do registro na ferramenta de origem |
| `importado_em` | primeira importação |
| `atualizado_em_origem` | última alteração na origem |
| `hash_conteudo` | hash dos campos sincronizados (detecta mudança real) |
| `status_sync` | `local`, `sincronizado`, `pendente`, `conflito`, `erro` |

`unique (fonte, id_externo)` garante idempotência: reimportar faz *upsert* e nunca duplica. Registros manuais têm `id_externo` nulo e não colidem entre si.

## Diferença em relação ao modelo da Fase 0
- `owner_id` em cada linha foi trocado por **proprietário único** em `app.proprietario` (ADR 0007).
- `tarefa_dependencias` e `avanco_fisico` explicitados como tabelas.
- `conectores.escrita_autorizada_em` torna a autorização de gravação externa verificável pelo próprio banco.

## Dicionário
[DICIONARIO_DE_DADOS.md](DICIONARIO_DE_DADOS.md), gerado automaticamente.

## Testes
`packages/db/tests/modelo.test.js` (21 testes) cobre os itens abaixo e também a proteção do proprietário, a imutabilidade da auditoria, o `search_path` fixo e o fuso das sessões:
- RLS em todas as tabelas, inclusive para anônimo, proprietário e outro usuário.
- Views respeitando o RLS.
- Idempotência da sincronização.
- Auditoria.
- Separação contratado/medido/faturado/recebido.
- Restrições de aditivos e medições.
- Priorização de tarefas.
- Autorização de escrita dos conectores.
- Busca em português.
