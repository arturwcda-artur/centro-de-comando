# Integrações

Diagnóstico completo em [fase-0/MAPA_DE_INTEGRACOES.md](fase-0/MAPA_DE_INTEGRACOES.md).

## Princípios
1. Nenhuma ferramenta existente é desativada ou substituída.
2. **Primeiro leitura, depois escrita.** A escrita fica desligada por padrão e é liberada por conector, com autorização registrada (RN-64).
3. Cada informação tem uma fonte oficial (ADR 0004).
4. Toda sincronização é rastreável (`sync_execucoes`, `sync_itens`) e idempotente (`unique (fonte, id_externo)`).
5. O código de integração fica em `packages/integrations/<ferramenta>` e não contém regras de gestão.

## Contrato de um conector
Todo conector implementa a mesma interface (definida na Fase 5):
```ts
interface Conector {
  ferramenta: Ferramenta;
  testarConexao(): Promise<EstadoConexao>;
  ler(desde?: Date): AsyncIterable<RegistroExterno>;     // somente leitura
  mapear(r: RegistroExterno): RegistroInterno;            // tradução pura, testável
  escrever?(op: OperacaoExterna): Promise<void>;          // só existe após autorização
}
```

## Painel de conectores (tabela `conectores`)
Para cada ferramenta o painel mostra:
- identificação, autenticação (`credencial_ref` → Supabase Vault) e configuração
- estado da conexão, última e próxima sincronização
- registros importados e pendentes
- histórico de erros e de alterações
- botões **Sincronizar agora** e **Pausar** (`pausado_ate`)

## Plano por ferramenta
| Ferramenta | Caminho | Fase | Fonte oficial de |
|---|---|---|---|
| Trello | API REST, só GET, a cada hora ✅ | 5 | tarefas operacionais de equipe |
| Google Agenda | endereço secreto **iCal**, a cada hora ✅ (ADR 0012) | 5 | compromissos/horários |
| Notion | API REST (integração interna, só leitura), a cada hora ✅ | 5 | histórico (Central de Gestão) |
| MS Project | agente local, COM via pywin32 | 6 | cronograma, linha de base |
| Excel | agente local, openpyxl, um modelo de importação por tipo de planilha | 7 | carga inicial de medições/orçamentos |
| Google Drive | API Drive v3, `drive.readonly` (nuvem) | 8 | arquivos (por referência) |
| GitHub | API REST | 9 | código do próprio sistema |
| Gmail, Todoist | a decidir | 9+ | — |

## Sincronizador (Fase 5)
- O código fica em `packages/integrations/src/`: `motor.js` (upsert idempotente e registro das execuções), `trello.js`, `google-ical.js`, `notion.js` e `sincronizar.js`, que é o ponto de entrada.
- O agendador é `.github/workflows/sincronizar.yml`, que roda a cada hora e também pelo botão **Run workflow**. A tela **Integrações** do sistema leva até ele.
- **Trello:** cartões abertos de todos os quadros viram tarefas `fonte = trello`.
  - A situação vem do nome da lista: concluído/feito → `concluida`; andamento/fazendo → `em_andamento`; o resto → `a_fazer`.
  - Cartões em que você é membro (ou sem membros) ficam sem responsável, ou seja, "minhas". Os de outros membros vão para a pessoa **Equipe (Trello)**.
  - Cartões arquivados ou excluídos viram `cancelada`, sem serem apagados.
- **Google Agenda:** cada endereço iCal é lido na janela de −7 a +90 dias.
  - As recorrências são expandidas, com EXDATE e exceções.
  - Eventos que somem da origem recebem `cancelado_em` (migration 0015) e saem das telas.
- **Notion:** só as bases compartilhadas com a integração.
  - Título com "demanda", "tarefa" ou "pendência" → tarefas `fonte = notion`.
  - Título com "reunião" → reuniões.
  - A situação "concluído", "feito" ou "resolvido" → `concluida`.
- **Tarefas importadas não são editadas no sistema** (RN-47), exceto a conclusão.
- **Concluir na origem (ADR 0013):** `packages/integrations/src/escrita.js`, chamado pela aplicação. Cada gravação fica em `operacoes_externas`. Cartões de terceiros são só leitura (RN-48).

## Segredos (o proprietário cadastra no GitHub; nunca vão para o Git nem para o banco)
Em **GitHub → repositório → Settings → Secrets and variables → Actions → New repository secret**, ou pelo terminal com `gh secret set NOME`, que pede o valor sem mostrá-lo:

| Segredo | Valor | Onde obter |
|---|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` | público |
| `SUPABASE_SERVICE_ROLE_KEY` | chave **secret** (`sb_secret_…`) | Supabase → Project Settings → API Keys |
| `TRELLO_API_KEY` | API key | trello.com/power-ups/admin → seu Power-Up → API key |
| `TRELLO_TOKEN` | token | link "Token" ao lado da API key |
| `GOOGLE_ICAL_URLS` | um endereço secreto iCal por linha | Google Agenda → Configurações → a agenda → Integrar agenda |
| `NOTION_TOKEN` | `ntn_…` | notion.so/profile/integrations → Conexões → Token de API. Por decisão do proprietário a conexão tem ler, atualizar e inserir (uso futuro com autorização, RN-64); o sincronizador só lê |

Se algum segredo vazar, revogue-o na origem: gere um novo endereço iCal ("Redefinir"), um novo token no Trello ou no Notion, ou uma nova secret key no Supabase. Depois atualize o segredo no GitHub.
