# MAPA DE INTEGRAÇÕES — Fase 0

## 1. Princípio
Cada ferramenta continua sendo usada como hoje. O Centro de Comando **lê primeiro, grava depois** (somente com sua autorização por conector). Cada informação tem **uma única fonte oficial**; as demais cópias são espelhos.

## 2. Dois caminhos de integração

```
                ┌───────────────────── NUVEM ─────────────────────┐
 Trello ──API──►│                                                 │
 G.Agenda ─API─►│  Conectores (jobs agendados)  ──►  PostgreSQL   │◄── App Next.js (PC/celular)
 Notion ──API──►│                                    (Supabase)   │
 G.Drive ─API──►│                                                 │
 GitHub ──API──►│                                                 │
                └─────────────────────────────▲───────────────────┘
                                              │ HTTPS (chave de serviço restrita)
                ┌──────────── SEU PC WINDOWS ─┴───────────────────┐
 MS Project ─COM►  Agente local (Python, reaproveita o motor PRF)  │
 Excel ─openpyxl►  - lê .mpp/.xlsx das pastas das obras           │
 Pastas ────────►  - envia somente dados estruturados             │
                └─────────────────────────────────────────────────┘
```

## 3. Matriz por ferramenta

| Ferramenta | Recursos disponíveis | Dados identificados | Possibilidades de integração | Limitações | Custos potenciais | Próxima providência |
|---|---|---|---|---|---|---|
| **Trello** | API REST; webhooks; conector MCP ativo (leitura/escrita) | 5 quadros (tarefas, C.SALLES, Objetivos, Obras do Grupo C.SALLES, NILLS Gerência) | Importar cartões → `tarefas` com `trello_card_id`; webhooks para atualização quase em tempo real; gravação futura (mover/comentar) | Limite de taxa (≈100 req/10 s por token); estrutura de listas varia por quadro | Gratuito | Você gerar API key + token Trello; definir mapeamento lista → status por quadro |
| **Google Agenda** | API Calendar v3; sync incremental por `syncToken`; push notifications | 4 agendas; eventos recorrentes de rotina e de obra | Importar eventos com `event_id` + `iCalUID`; vincular a obra/reunião; criar eventos só após autorização | OAuth com app próprio no Google Cloud; agenda "Todoist" é somente leitura | Gratuito | Criar projeto Google Cloud + tela de consentimento (modo teste) |
| **Notion** | API REST; conector MCP ativo | Central de Gestão (Demandas Ativas, Histórico de Reuniões, Acompanhamento Semanal) | Importar Demandas → tarefas/pendências; Reuniões → reuniões/decisões; ID da página como chave externa | Integração precisa ser compartilhada página a página; limite ≈3 req/s; sem webhooks maduros (polling) | Gratuito | Decidir se a Central do Notion continua ativa ou vira só histórico |
| **Excel** | Arquivos locais; openpyxl já em uso | ~1.200 planilhas (medições, orçamentos, aditivos, pleitos) | Agente local lê planilhas com **layout cadastrado** (modelo de importação por tipo); exportação de relatórios .xlsx pelo sistema | Sem padrão único entre obras; fórmulas/mesclas; arquivo aberto bloqueia leitura | Gratuito | Escolher 1 planilha-modelo por tipo (medição, orçamento) para o primeiro importador |
| **MS Project** | COM (pywin32) já funcionando no motor PRF; exportação XML | 46 .mpp | Agente local extrai tarefas, datas, % concluído, linha de base, predecessoras, caminho crítico → `cronograma_versoes` | Exige PC Windows ligado com Project instalado; sem API em nuvem | Gratuito (licença já existente) | Confirmar quais .mpp são "vigentes" por obra |
| **Google Drive** | API Drive v3; pasta DESKTOP-EMPRESA já sincronizada | 9,4 GB de documentos de obras | Indexar metadados (nome, pasta, data, `file_id`, link) sem copiar arquivos; busca por conteúdo via texto extraído | Extração de texto de PDF escaneado exige OCR | Gratuito (dentro da cota atual do Drive) | Autorizar escopo `drive.readonly` |
| **GitHub** | API; Actions | Nenhum repositório remoto | Hospedar o código; CI de testes; integração com Vercel | Não autenticado nesta sessão | Gratuito (repo privado) | Criar/confirmar conta e repositório privado |
| **Gmail** *(não estava na lista)* | API; conector MCP ativo | ~325 mensagens na caixa de entrada | Futuro: vincular e-mails a obras/pendências | Escopos "restritos" do Google | Gratuito | Decidir se entra no escopo |
| **Todoist** *(não estava na lista)* | API REST | Uso detectado via feed na Agenda | Importar tarefas, se continuar em uso | Sem conector ativo | Gratuito | Confirmar se ainda usa |

## 4. Fonte oficial proposta (a confirmar)

| Informação | Fonte oficial proposta | Espelhos |
|---|---|---|
| Cronograma detalhado, datas planejadas, linha de base | **MS Project** | Centro de Comando (somente leitura) |
| Avanço físico consolidado / medições | **Centro de Comando** (após importação inicial do Excel) | Excel (exportação) |
| Contratos, aditivos, valores | **Centro de Comando** | Pastas 03/04 (documentos comprobatórios) |
| Tarefas operacionais de equipe | **Trello** | Centro de Comando |
| Tarefas/atribuições pessoais do gestor | **Centro de Comando** (a definir vs. Notion/Todoist) | Trello/Notion |
| Compromissos e reuniões (horário) | **Google Agenda** | Centro de Comando |
| Atas e decisões | **Centro de Comando** | Notion (histórico) |
| Arquivos (documentos) | **Google Drive / pastas** | Centro de Comando guarda só índice e referência |

## 5. Regras de sincronização (valem para todos os conectores)
1. Toda linha importada guarda: `fonte`, `id_externo`, `importado_em`, `atualizado_em_origem`, `hash_conteudo`, `status_sync`.
2. Chave única `(fonte, id_externo)` → reimportar nunca duplica (idempotência por *upsert*).
3. Se o `hash` não mudou, nada é gravado.
4. Se o registro foi alterado **nos dois lados** desde a última sincronização → vira **conflito** para você decidir; nada é sobrescrito automaticamente.
5. Gravação externa desligada por padrão; ligada por conector e por tipo de operação, com registro em auditoria.
6. Cada execução gera um registro em `sync_execucoes` (início, fim, lidos, criados, atualizados, ignorados, erros).
