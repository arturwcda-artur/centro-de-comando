# ADR 0020 — Integrações completas

- **Data:** 2026-11-05
- **Status:** aceita

## Contexto

A tela Integrações mostrava só o que passa pelo sincronizador. MS Project, Excel e pastas das obras são lidos pelo agente local e ficavam sem estado. Não havia como pausar uma leitura, disparar a sincronização pelo sistema ou ver as gravações externas. O proprietário também quer dar ordens ao Notion a partir do sistema.

## Decisão

1. **Agente informa as leituras.** A função `registrar_execucao_agente` grava em `conectores` e `sync_execucoes`. Se ela falhar, a leitura continua.
2. **Pausa só na leitura.** `pausado_ate` no futuro faz o sincronizador pular o conector. As gravações feitas pelas telas continuam, porque são ações diretas do proprietário.
3. **Sincronizar agora** dispara a rotina do GitHub Actions com um token só de servidor, restrito a este repositório. Sem o token, o botão continua abrindo o GitHub.
4. **Alerta no Painel** para erro ou leitura atrasada. Tolerância de 3 horas para o que roda de hora em hora e de 20% para a rotina semanal. Conector pausado não gera alerta.
5. **Demanda no Notion:** grava primeiro no Notion e registra em `operacoes_externas`. A cópia local chega na sincronização seguinte, mantendo o Notion como fonte oficial.

## Fora do escopo

- Tela de conflitos: não houve conflito real até agora.
- Integração com GitHub, Gmail e Todoist.

## Consequências

- Nenhum custo novo: Actions e Vercel seguem nos planos gratuitos.
- Um token a mais para o proprietário manter, com permissão mínima.
