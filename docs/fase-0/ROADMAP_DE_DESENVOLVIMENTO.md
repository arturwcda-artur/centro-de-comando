# ROADMAP DE DESENVOLVIMENTO — Fase 0

Cada fase termina com: código no GitHub, testes passando, documentação atualizada, entrada no CHANGELOG e **sua aprovação** antes da próxima.

| Fase | Entregas principais | Depende de | Critério de aceite | Esforço estimado* |
|---|---|---|---|---|
| **0 — Auditoria** | Estes 8 documentos | — | Sua aprovação | concluída |
| **1 — Arquitetura e modelagem** | Repositório GitHub privado; docs permanentes (README, ARCHITECTURE, DATABASE, INTEGRATIONS, SECURITY, ROADMAP, CHANGELOG, DEPLOYMENT, REGRAS_DE_NEGOCIO); ADRs; migrations SQL revisadas; dicionário de dados | Decisões D1–D6 | Modelo aprovado; migrations rodando em banco local/descartável | 2–3 sessões |
| **2 — Nuvem e segurança** | Projeto Supabase; Vercel ligada ao GitHub; Auth com MFA; RLS em todas as tabelas; auditoria por trigger; backup semanal para o Drive; CI com testes | Fase 1; contas criadas por você | Teste automatizado prova que usuário anônimo não lê nada | 2 sessões |
| **3 — Dashboard e navegação** | Layout com menu lateral, pesquisa global, PWA instalável, tela inicial com indicadores (vazios até haver dados) | Fase 2 | Abre no PC e no celular; Lighthouse PWA ok | 2 sessões |
| **4 — Obras** | Cadastro de empresas, contratantes, obras, participantes; ambiente individual da obra com abas; **importação assistida** das obras a partir das pastas 2.1/2.2/2.3 (você confirma cada uma) | Fase 3 | Obras reais cadastradas por você, sem dado inventado | 2–3 sessões |
| **5 — Tarefas, atribuições e agenda** | Tarefas com as 6 visões; "Meu dia" com priorização (urgência × importância × prazo × impacto, sem alterar prazos); **conectores de leitura Trello, Google Agenda, Notion** | Fase 4 | Reimportar 2× não duplica nada | 3–4 sessões |
| **6 — Planejamento** | **Agente local** (Python) lendo .mpp via COM; versões de cronograma; linha de base; marcos; Curva S; previsto × realizado | Fase 4 | Cronograma PRF REV-02 importado e conferido com o Project | 3 sessões |
| **7 — Contratos e financeiro** | Contratos, aditivos, medições, faturamento, recebimento, previsões; importador de planilha de medição (1 modelo por vez) | Fase 4 | Saldos batem com as planilhas oficiais de uma obra-piloto | 3 sessões |
| **8 — Documentos e relatórios** | Indexação do Drive por obra (sem cópia); busca por texto; relatórios executivos Excel/PDF | Fases 4–7 | Encontrar um documento por palavra do conteúdo | 2–3 sessões |
| **9 — Integrações completas** | Painel de conectores (estado, última/próxima sync, erros, pausar, sincronizar agora); conflitos; **gravação externa opt-in**; GitHub; Gmail/Todoist se aprovados | Fases 5–8 | Nenhuma escrita externa sem autorização registrada | 2–3 sessões |
| **10 — IA e automações** | Assistente com consulta às views; resposta com fonte/data; distinção confirmado/estimado/recomendação; controle de custo; alertas automáticos | Fase 9 | Respostas citam origem; teto de gasto mensal respeitado | 2–3 sessões |
| **11 — Testes, implantação, otimização** | Testes ponta a ponta, desempenho, domínio próprio, manual de uso, teste de restauração de backup | Todas | Restauração de backup testada com sucesso | 2 sessões |

\* "Sessão" = um ciclo de trabalho comigo com entrega revisável. É uma ordem de grandeza, não um prazo contratual.

## Marco de valor antecipado
Para ter utilidade cedo, proponho que o **primeiro uso real** aconteça ao fim da Fase 5: obras cadastradas + "Meu dia" + tarefas e agenda unificadas (Trello/Notion/Google) — antes de cronograma e financeiro.

## Obra-piloto sugerida
**PRF-Recanto**: já tem cronograma REV-02 estruturado, motor Python, planilha de aditivo e escopo conhecido (retomada 13/10/2026). Reduz o risco de importação nas Fases 6 e 7.
