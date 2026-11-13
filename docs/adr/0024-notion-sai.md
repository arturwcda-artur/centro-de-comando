# ADR 0024 — Notion sai do sistema

- **Data:** 2026-11-13
- **Status:** aceita
- **Substitui em parte:** ADR 0012 e ADR 0020, no que diz respeito ao Notion

## Contexto

O proprietário deixou de usar o Notion para demandas. Os problemas e planos de ação passaram para o próprio sistema (ADR 0023). A Demanda no Notion foi usada uma vez.

## Decisão

1. Sai a leitura do Notion no sincronizador, a **Demanda no Notion** e a conclusão de tarefas no Notion.
2. As 13 tarefas que vieram do Notion ficam no sistema como tarefas manuais, editáveis. A reunião importada também fica.
3. O conector `notion` fica inativo, com o histórico preservado.
4. O segredo `NOTION_TOKEN` deixa de ser usado. O proprietário pode apagá-lo no GitHub e na Vercel, e revogar a integração no Notion.

## Consequências

- Uma ferramenta a menos para manter e um token a menos guardado.
- Mudanças feitas no Notion não chegam mais ao sistema.
