# Roadmap

Cada fase termina com código no GitHub, testes passando, documentação atualizada, uma entrada no CHANGELOG e **aprovação do proprietário** antes da fase seguinte. Detalhamento original em [fase-0/ROADMAP_DE_DESENVOLVIMENTO.md](fase-0/ROADMAP_DE_DESENVOLVIMENTO.md).

| Fase | Entregas | Estado |
|---|---|---|
| 0 — Auditoria | 8 documentos de diagnóstico | ✅ aprovada em 03/11/2026 |
| 1 — Arquitetura e modelagem | repositório, docs permanentes, ADRs, 10 migrations, 17 testes, dicionário | ✅ aprovada em 03/11/2026 |
| 2 — Nuvem e segurança | Supabase, Auth+MFA, migrations aplicadas, CI, backup semanal | ✅ aprovada em 03/11/2026 |
| 3 — Dashboard e navegação | login + MFA, layout, menu lateral, busca global, painel, PWA | ✅ aprovada em 03/11/2026 · https://centro-de-comando-chi.vercel.app |
| 4 — Obras | cadastros, importação assistida, ambiente da obra, riscos e decisões | ✅ entregue em 03/11/2026. Importação revisada pelo proprietário: 23 propostas, 8 obras aprovadas (7 em andamento, 1 aguardando), 15 descartadas. Aprovada em 03/11/2026 |
| 5 — Tarefas e agenda | "Meu dia", 6 visões, conectores de leitura Trello, Agenda e Notion — **primeiro uso real** | ✅ aprovada em 04/11/2026 |
| 5+ — Equipe e detalhes do Trello | painel por lista e responsável, comentários, checklists e cartão a partir de comentário (ADR 0017) | ✅ concluída em 05/11/2026, só no quadro Obras do Grupo - C.SALLES, com cartões de rotina |
| 6 — Planejamento | agente local MS Project, versões, Curva S (piloto: PRF-Recanto) | ✅ aprovada em 04/11/2026 |
| 7 — Contratos e financeiro | contratos, aditivos, medições, importador de planilha | ✅ aprovada em 04/11/2026 |
| 8 — Documentos e relatórios | índice do Drive, busca, relatórios Excel/PDF | 🔶 parte 1 (Documentos) no ar em 05/11/2026, piloto PRF-Recanto; parte 2 (Relatórios) a seguir |
| 9 — Integrações completas | painel de conectores, conflitos, escrita opt-in | |
| 10 — IA e automações | assistente com fonte e data, alertas, teto de custo | |
| 11 — Testes e implantação | E2E, desempenho, domínio, teste de restauração | |

## Decisões da Fase 0 assumidas na aprovação de 03/11/2026
O proprietário aprovou com "Aprovo, seguir". Foram adotadas as recomendações D1–D7. Qualquer uma pode ser revista:
- D1 pilha aprovada · D2 tarefas pessoais no Centro de Comando, Trello para equipe · D3 Central do Notion importada como histórico · D4 Gmail/Todoist fora até a Fase 9 · D5 obras confirmadas uma a uma na Fase 4 · D6 ~~contas gratuitas agora, Pro na Fase 5~~ (substituída abaixo) · D7 financeiro da empresa fora do escopo.

## Decisão de custo zero (03/11/2026)
O proprietário decidiu que o sistema deve ser **totalmente gratuito**. Isso substitui a D6 e o "Cenário B" de [fase-0/ESTIMATIVA_DE_CUSTOS.md](fase-0/ESTIMATIVA_DE_CUSTOS.md).
- **Planos:** Supabase Free, Vercel Hobby e GitHub Free, sem previsão de migração para planos pagos.
- **Pausa do Supabase Free após 7 dias sem uso:** o uso diário evita a pausa. Um "manter ativo" automático pode ser adicionado, e a reativação é feita pelo painel.
- **Sem backup diário gerenciado:** o backup do agente local cobre esse ponto. Ele é semanal hoje e pode passar a diário.
- **Limites (500 MB de banco, 1 GB de storage):** os documentos ficam no Google Drive, e o banco guarda só a referência (ADR 0003).
- **IA (Fase 10):** só entra com opção de custo zero ou como recurso opcional e desligável, decidido com o proprietário antes.
- **Segundo fator:** o TOTP é gratuito no Supabase. Use apps oficiais gratuitos (Google Authenticator, da Google LLC, ou Microsoft Authenticator) e evite os clones pagos das lojas.
