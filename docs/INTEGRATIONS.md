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
| Google Agenda | **API oficial**, leitura e gravação (ADR 0014); iCal enquanto não conectar | 5 | compromissos/horários |
| Notion | API REST (integração interna, só leitura), a cada hora ✅ | 5 | histórico (Central de Gestão) |
| MS Project | agente local, COM via pywin32, somente leitura ✅ (ADR 0015) | 6 | cronograma, linha de base |
| Excel | agente local, openpyxl, somente leitura, um modelo por tipo de planilha ✅ (ADR 0016) | 7 | itens e quantidades das medições |
| Google Drive | API Drive v3, `drive.metadata.readonly`, só dados dos arquivos ✅ (ADR 0018) | 8 | link dos arquivos (por referência) |
| Gmail, Todoist | a decidir | 9+ | — |

## Sincronizador (Fase 5)
- O código fica em `packages/integrations/src/`: `motor.js` (upsert idempotente e registro das execuções), `trello.js`, `google.js`, `google-ical.js`, `notion.js` e `sincronizar.js`, que é o ponto de entrada.
- O agendador é `.github/workflows/sincronizar.yml`, que roda a cada hora e também pelo botão **Run workflow**. A tela **Integrações** do sistema leva até ele.
- **Trello:** cartões abertos de todos os quadros viram tarefas `fonte = trello`.
  - A situação vem do nome da lista: concluído/feito → `concluida`; andamento/fazendo → `em_andamento`; o resto → `a_fazer`.
  - Cartões em que você é membro (ou sem membros) ficam sem responsável, ou seja, "minhas". Os de outros membros vão para a pessoa **Equipe (Trello)**.
  - Cartões arquivados ou excluídos viram `cancelada`, sem serem apagados.
- **Google Agenda:** a agenda principal é lida pela API na janela de −7 a +90 dias. Sem conexão feita, a leitura usa os endereços iCal.
  - As recorrências são expandidas.
  - Na primeira leitura pela API, as cópias do iCal recebem `cancelado_em`.
  - Eventos que somem da origem recebem `cancelado_em` (migration 0015) e saem das telas.
- **Notion:** só as bases compartilhadas com a integração.
  - Título com "demanda", "tarefa" ou "pendência" → tarefas `fonte = notion`.
  - Título com "reunião" → reuniões.
  - A situação "concluído", "feito" ou "resolvido" → `concluida`.
- **Tarefas importadas não são editadas no sistema** (RN-47), exceto a conclusão.
- **Assistente no Claude (ADR 0021):** conector MCP em `/api/mcp`, com cinco ferramentas só de leitura. Autorização pelo servidor OAuth do Supabase na tela `/oauth/consent`, e revogação em Integrações.
- **Demanda no Notion:** `criarDemandaNotion` cria a página em Demandas Ativas como Pendente, e a cópia chega na sincronização seguinte. Cada gravação fica em `operacoes_externas`.
- **Pausar leitura:** com `pausado_ate` no futuro, o sincronizador não lê o conector. A gravação feita pelas telas continua funcionando.
- **Agenda pelo sistema (ADR 0014):** criar, alterar e excluir ficam em `packages/integrations/src/google.js`, chamados pela aplicação. Cada gravação fica em `operacoes_externas` (RN-67).
- **Quadro detalhado (ADR 0017):** só em Obras do Grupo - C.SALLES, o sincronizador lê também membros, checklists, comentários e cartões arquivados que estavam concluídos.
- **Concluir na origem (ADR 0013):** `packages/integrations/src/escrita.js`, chamado pela aplicação. Cada gravação fica em `operacoes_externas`. Cartões de terceiros são só leitura (RN-48).

## MS Project (Fase 6)
- O agente `cc_agente.cronogramas` lê os arquivos de `cronograma_arquivos` e só abre os que mudaram.
- Se o Project estiver aberto, nada é lido: feche-o e rode de novo.
- Cada arquivo tem um papel: `vigente`, `linha_base` ou `historico`.
- Para incluir outra obra, cadastre os arquivos em `cronograma_arquivos`. Não é preciso programar.

## Medições em Excel (Fase 7)
- O agente `cc_agente.medicoes` lê a planilha cadastrada em cada contrato e só relê a que mudou.
- A planilha só atualiza medições **elaboradas**. A partir do envio, a diferença aparece na tela.
- Para incluir um novo modelo, crie a função em `cc_agente/medicoes.py`, registre em `MODELOS` e libere o nome em `medicao_arquivos.modelo`.

## Documentos (Fase 8)
- O agente `cc_agente.documentos` percorre as pastas de `documento_pastas` e só relê o arquivo que mudou.
- O sincronizador liga cada documento ao Drive pelo caminho, em `documento_links`.
- Para incluir outra obra, cadastre a pasta em `documento_pastas`. Não é preciso programar.

## Segredos (o proprietário cadastra no GitHub; nunca vão para o Git nem para o banco)
Em **GitHub → repositório → Settings → Secrets and variables → Actions → New repository secret**, ou pelo terminal com `gh secret set NOME`, que pede o valor sem mostrá-lo:

| Segredo | Valor | Onde obter |
|---|---|---|
| `SUPABASE_URL` | `https://<ref>.supabase.co` | público |
| `SUPABASE_SERVICE_ROLE_KEY` | chave **secret** (`sb_secret_…`) | Supabase → Project Settings → API Keys |
| `TRELLO_API_KEY` | API key | trello.com/power-ups/admin → seu Power-Up → API key |
| `TRELLO_TOKEN` | token | link "Token" ao lado da API key |
| `GOOGLE_ICAL_URLS` | um endereço secreto iCal por linha | Google Agenda → Configurações → a agenda → Integrar agenda |
| `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` | ID e chave do cliente OAuth | Google Cloud → APIs e serviços → Credenciais. Os mesmos dois valores vão também para a Vercel |
| `NOTION_TOKEN` | `ntn_…` | notion.so/profile/integrations → Conexões → Token de API. Por decisão do proprietário a conexão tem ler, atualizar e inserir (uso futuro com autorização, RN-64); o sincronizador só lê |

Se algum segredo vazar, revogue-o na origem: gere um novo endereço iCal ("Redefinir"), um novo token no Trello ou no Notion, ou uma nova secret key no Supabase. Depois atualize o segredo no GitHub.

O token de longa duração do Google não fica no GitHub: ele vai para o cofre do Supabase ao clicar em **Conectar Google**. Para cortar o acesso, remova o app em myaccount.google.com → Segurança → Apps de terceiros.
