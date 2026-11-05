# Regras de Negócio

Cada regra tem um identificador (RN-xx) para ser citada em código, testes e ADRs. Onde a regra é calculada em SQL, a view correspondente está indicada.

## 1. Obras
- **RN-01** Situações possíveis: `planejamento`, `andamento`, `paralisada`, `aguardando`, `concluida`, `cancelada`.
- **RN-02** Cada obra pertence a uma **empresa executora** (pela qual o gestor atua) e a um **contratante**. São entidades diferentes.
- **RN-03** Valores e avanços da obra **não são digitados na obra**. Eles vêm de contratos, aditivos, medições e avanço físico (`v_obra_resumo`).
- **RN-04** Nenhuma obra é cadastrada a partir de suposições. O cadastro inicial é assistido e confirmado pelo usuário.
- **RN-05** Importação assistida: o agente local só **lê** as pastas `2.1-EM ANDAMENTO` (sugere `andamento`), `2.2-AGUARDANDO` (`aguardando`) e `2.3-FINALIZADAS` (`concluida`). Cada pasta gera uma **proposta**. A obra só existe depois que o proprietário aprova, e cada proposta pode ser corrigida ou descartada.
- **RN-06** Pastas agrupadoras (hoje: `LEVORSSE`) geram uma proposta por subpasta, ou seja, por frente de obra. Pastas que provavelmente não são obras (`PEDIDOS GERAIS`) vêm marcadas, mas não são descartadas automaticamente.
- **RN-07** Reler as pastas atualiza só as evidências da proposta (contagens, tamanho, data). As sugestões e a revisão do proprietário são preservadas.
- **RN-08** O código da obra é único, em maiúsculas, com letras, números e hífen. Pastas com o mesmo nome recebem a situação como sufixo (ex.: `MIRANTE-CONCLUIDA`).
- **RN-09** Ao aprovar com empresa ou contratante digitados, o sistema reaproveita um cadastro com o mesmo nome antes de criar outro.
- **RN-10a** Obras e cadastros não são apagados pela interface, apenas **arquivados** (`arquivado_em`). O histórico e a auditoria permanecem.

## 2. Contratos e financeiro — separação de valores (`v_contratos_resumo`)
| Conceito | Regra |
|---|---|
| **RN-10 Valor contratado** | valor original + Σ `valor_delta` dos aditivos **aprovados** |
| **RN-11 Prazo vigente** | data de término original + Σ `dias_delta` dos aditivos **aprovados** |
| **RN-12 Valor medido** | Σ (valor medido − glosa) das medições **aprovadas** (ou aprovadas com glosa) |
| **RN-13 Valor faturado** | Σ lançamentos `faturamento` com data efetiva |
| **RN-14 Valor recebido** | Σ lançamentos `recebimento` com data efetiva |
| **RN-15 Saldo a medir** | contratado − medido |
| **RN-16 Saldo a receber** | faturado − recebido |
| **RN-17 Executado** | % físico realizado × valor contratado (indicador; não substitui medição) |

- **RN-18** Supressão tem `valor_delta` ≤ 0. Acréscimo e reajuste têm valor ≥ 0. Aditivo só de prazo tem valor = 0.
- **RN-19** Aditivos `em_analise` ou `rejeitado` não alteram valor nem prazo.
- **RN-20** O número da medição é único por contrato. A glosa nunca supera o valor medido.
- **RN-21** Moeda única: R$, com 2 casas decimais.
- **RN-22** Medição importada entra como elaborada. Só o proprietário muda a situação.
- **RN-23** A planilha só atualiza medições elaboradas. Depois do envio, a diferença é registrada e mostrada, sem alterar a medição.
- **RN-24** O saldo por serviço conta toda medição não cancelada. O valor medido do contrato conta só as aprovadas (RN-12).

## 3. Prazos e atrasos (`v_obra_resumo`)
- **RN-30** *Dias além do prazo* = max(0, hoje − prazo vigente), só para obras não concluídas e não canceladas.
- **RN-31** *Desvio físico* = % realizado − % previsto da última medição de avanço.
- **RN-32** "Hoje" é sempre a data em America/Sao_Paulo (`app.hoje()`).

## 4. Tarefas e "Meu dia" (`v_tarefas_priorizadas`)
- **RN-40** O sistema **nunca altera prazos automaticamente**. A priorização só ordena as tarefas.
- **RN-41** Urgência, derivada do prazo:

  | Situação do prazo | Urgência |
  |---|---|
  | vencido ou vence hoje | 5 |
  | vence em até 2 dias | 4 |
  | vence em até 7 dias | 3 |
  | vence em até 15 dias | 2 |
  | mais de 15 dias ou sem prazo | 1 |

- **RN-42** Importância e impacto: 1 a 5, padrão 3, definidos pelo usuário.
- **RN-43** **Escore = 3·urgência + 2·importância + 2·impacto** (de 7 a 35). Ordenação decrescente.
- **RN-44** Status `aguardando_terceiro` exige indicar de quem se aguarda.
- **RN-45** Visões:

  | Visão | Critério |
  |---|---|
  | Minhas atribuições | responsável é a pessoa marcada `eh_usuario` ("Sou eu" em Cadastros → Pessoas) **ou não há responsável** (migration 0014) |
  | Aguardando terceiros | status `aguardando_terceiro` |
  | Cobranças | tipo `cobranca` |
  | Atividades críticas | `critica = true` ou escore ≥ 27 |
  | Vencimentos | prazo nos próximos 15 dias ou vencido |
  | Concluídas | status `concluida` |

- **RN-45a** A tela Tarefas abre na visão **Todas**, com as tarefas abertas de toda a equipe, e aceita filtro por quadro e por responsável do Trello. **Meu dia** continua mostrando só as tarefas do proprietário.
- **RN-46** **Meu dia** mostra em "foco" as minhas tarefas vencidas, de hoje, críticas ou com escore ≥ 27 (até 8), seguidas das 5 próximas por escore. Cada tarefa vem com o motivo da posição (vencida, vence hoje, crítica, impacto alto…). É uma recomendação: nada é reagendado.
- **RN-47** Tarefas importadas (Trello, Notion) não são editadas no sistema, exceto a conclusão (RN-48) e a criação de cartão a partir de comentário (RN-49). Para as demais alterações, a fonte oficial é a ferramenta de origem.
- **RN-48** Podem ser concluídas pelo sistema: tarefas manuais, do Notion e cartões do Trello do proprietário. **Cartões de terceiros são só leitura.** A conclusão é gravada primeiro na origem; se a origem recusar, a tarefa continua aberta e o erro aparece na tela. No Trello e no Notion nada é excluído (ADR 0013).
- **RN-49** No quadro Obras do Grupo - C.SALLES, um comentário pode virar cartão novo no mesmo quadro, uma única vez. O comentário e o cartão de origem não mudam, mesmo em cartões de terceiros (ADR 0017).
- **RN-49a** Taxa de eficiência da equipe = cartões concluídos até a primeira data de entrega ÷ (concluídos com prazo + vencidos em aberto). Adiar a data não melhora a taxa. Cartões sem prazo entram só no tempo médio, da criação à conclusão.
- **RN-49b** Cartão de rotina é marcado pelo proprietário no sistema. Ele sai das contagens de cartões e da taxa de eficiência, mesmo com prazo, e conta pelos itens de checklist concluídos.

## 5. Riscos e decisões
- **RN-50** Severidade = probabilidade × impacto (1 a 25). **Crítico** quando ≥ 15, **alto** de 8 a 14, **moderado** até 7.
- **RN-51** Uma decisão com status `tomada` precisa ter o texto da decisão registrado.

## 6. Integrações
- **RN-60** Cada tipo de informação tem **uma fonte oficial** (ADR 0004). As demais ferramentas são espelhos.
- **RN-61** Reimportar o mesmo registro (mesma fonte e mesmo id externo) atualiza, nunca duplica.
- **RN-62** Se o hash não mudou, nada é gravado.
- **RN-63** Se houve alteração nos dois lados desde a última sincronização, gera-se um **conflito** para decisão do usuário. Nada é sobrescrito sozinho.
- **RN-64** A gravação em ferramenta externa exige `modo = leitura_escrita` **e** `escrita_autorizada_em` preenchido pelo proprietário.
- **RN-67** Compromissos da agenda principal são criados, alterados e excluídos pelo sistema, gravando primeiro no Google. Em evento recorrente, a mudança vale só para a data escolhida. A exclusão pede confirmação e, no sistema, o registro fica como cancelado (ADR 0014).
- **RN-68** A linha de base só muda por ação do proprietário. Um arquivo de linha de base alterado entra como reprogramação, e a tela avisa (ADR 0015).
- **RN-65** O MS Project é a fonte oficial do cronograma. O sistema só lê os arquivos `.mpp`.
- **RN-66** Listas do Trello com nomes ligados a credenciais (senha, password, credencial, login, token) e cartões, comentários ou itens de checklist com credencial escrita (por exemplo, `senha:`) **nunca são importados**. Os cartões continuam no Trello; apenas não são copiados para o banco, a auditoria ou os backups.

## 7. Documentos
- **RN-70** O arquivo original não é copiado nem alterado. O sistema guarda índice, referência (Drive/caminho) e texto extraído.
- **RN-71** A categoria vem da pasta de origem (01–15/99 da estrutura-padrão das obras).
- **RN-72** Nomes ligados a credenciais não entram no índice. Texto com credencial não é copiado, e o arquivo entra só pelo nome. Arquivo que some da pasta sai da busca, sem apagar o registro.

## 8. IA (Fase 10)
- **RN-80** A IA responde só com base nas views de leitura, indicando fonte e data de atualização.
- **RN-81** Cada resposta separa **confirmado**, **estimado** e **recomendação**.
- **RN-82** A IA não executa alteração externa sem autorização.
