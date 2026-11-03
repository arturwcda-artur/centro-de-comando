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
| Trello | API REST + webhooks (nuvem) | 5 | tarefas operacionais de equipe |
| Google Agenda | API Calendar v3, `syncToken` incremental (nuvem) | 5 | compromissos/horários |
| Notion | API REST, polling (nuvem) | 5 | histórico (Central de Gestão congelada) |
| MS Project | agente local, COM via pywin32 | 6 | cronograma, linha de base |
| Excel | agente local, openpyxl, um modelo de importação por tipo de planilha | 7 | carga inicial de medições/orçamentos |
| Google Drive | API Drive v3, `drive.readonly` (nuvem) | 8 | arquivos (por referência) |
| GitHub | API REST | 9 | código do próprio sistema |
| Gmail, Todoist | a decidir | 9+ | — |

## Credenciais necessárias (o proprietário cria; nunca vão para o Git)
| Ferramenta | O que criar |
|---|---|
| Google | projeto no Google Cloud, tela de consentimento em modo teste, OAuth Client (web) |
| Trello | API key + token (Power-Up admin) |
| Notion | integração interna, compartilhada com as páginas desejadas |
| GitHub | já via `gh auth login` / app Vercel |
