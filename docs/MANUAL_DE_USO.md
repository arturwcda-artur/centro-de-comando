# Manual de uso

Guia curto do Centro de Comando. Endereço: https://centro-de-comando-chi.vercel.app

## Rotina

| Quando | O que fazer | Onde |
|---|---|---|
| Todo dia | Decidir, aprovar e cobrar o que precisa de você | **Mesa do Gestor** (tela inicial) |
| Todo dia | Ver prioridades e compromissos | **Meu dia** |
| Todo dia | Ver o que pede atenção | **Alertas** |
| Toda semana | Ver quanto a equipe resolveu | **Equipe** |
| Toda semana | Conferir se as integrações estão em dia | **Integrações** |
| Ao fechar medição | Salvar a planilha e conferir em **Contratos** | Pasta da obra |
| A cada 3 meses | Rodar o teste de restauração | Ver abaixo |

## Mesa do Gestor

Tela inicial. Mostra só o que precisa da direção do gestor operacional no Grupo C.Salles, com filtro por empresa, obra e área.

| Caixa | O que aparece |
|---|---|
| 🔴 Decidir | Decisões pendentes lançadas pelo assistente, com recomendação, motivo, impacto e prazo |
| 🟠 Aprovar | Aprovações lançadas pelo assistente, medições elaboradas/enviadas e aditivos em análise |
| 🟡 Cobrar | Tarefas delegadas vencidas ou sem movimento há 7 dias |
| ⚠️ Alertas | Marcos e recebimentos dos próximos 15 dias, riscos críticos, contratos e integrações; marcos vencidos aparecem numa linha só |

Clique numa decisão para: **Decidido** (registra), **Delegar** (vira tarefa e cartão no Trello; volta em Cobrar se atrasar) ou **Adiar** (volta na data escolhida). O painel executivo antigo fica em **/painel**.

## O que acontece sozinho

| Rotina | Quando | Precisa do computador ligado? |
|---|---|---|
| Sincronização de Trello, Agenda, Drive e Notion | De hora em hora | Não |
| Conferência do sistema publicado | Todo dia, cerca de 07:17 | Não |
| Backup do banco | Segunda, 08:00 | Sim. Se estiver desligado, roda ao ligar |
| Leitura de cronogramas, medições e pastas | Segunda, 08:30 | Sim. Se estiver desligado, roda ao ligar |

## Onde cada dado é mantido

| Dado | Onde alterar |
|---|---|
| Cartões da equipe | Trello |
| Compromissos | Google Agenda ou tela **Agenda** |
| Demandas | Notion ou **Tarefas > Demanda no Notion** |
| Cronograma | MS Project |
| Medição | Planilha Excel da obra |
| Problemas e planos 5W2H | Tela **Problemas** |
| Obras, contratos, riscos e decisões | Centro de Comando |

Depois de mudar um dado fora do sistema, espere a próxima sincronização. Em **Integrações**, **Sincronizar agora** antecipa a leitura.

## Assistente no Claude

1. Abra uma conversa no Claude.
2. No botão **+**, em **Conectores**, deixe `Centro de Comando` ligado.
3. Pergunte em linguagem normal, por exemplo: "O que está vencido na PRF?"

O assistente só lê. Ele não vê agenda, cronograma detalhado, documentos, números da Equipe nem conteúdo com credencial. Para cortar o acesso, use **Revogar** em **Integrações**.

## Teste de restauração

Com o computador ligado, abra o atalho `agente-local\testar-restauracao.cmd`. O resultado certo termina com `Diferentes: 0. Ausentes: 0.`

## Quando algo parar

Veja o [Plano de recuperação](RECUPERACAO.md).
