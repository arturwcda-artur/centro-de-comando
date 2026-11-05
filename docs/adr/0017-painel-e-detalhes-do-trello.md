# ADR 0017 — Painel da equipe e detalhes do cartão do Trello
**Status:** Aceita · **Data:** 2026-11-05 · Altera o ADR 0013

## Contexto
O proprietário quer medir a eficiência da equipe, ver checklists e comentários dos cartões e transformar um comentário em cartão novo sem sair do sistema. Ele limitou essas funções ao quadro **Obras do Grupo - C.SALLES**.

## Decisão
1. **Escopo:** só esse quadro (`QUADRO_DETALHADO`). Os outros quadros continuam como estavam.
2. **Responsáveis reais:** `trello_membros` e `tarefa_membros`, fora de `pessoas`. O campo `responsavel_id` não muda, então Meu dia e conclusão continuam iguais.
3. **Arquivados:** entram se estavam concluídos, para não prejudicar quem arquiva o que termina. Os demais ficam de fora da contagem.
4. **Contagem:**
   - **Taxa de eficiência:** concluídos até a **primeira** data de entrega, divididos pelos concluídos com prazo mais os vencidos em aberto (decisão do proprietário). Adiar a data não melhora a taxa, e cada mudança aparece em **Prazos alterados**.
   - **Unidade de tarefa (decisão do proprietário):** cada item de checklist vale 1, e o cartão sem checklist vale 1. Cartão concluído resolve todos os seus itens.
   - **Crédito (decisão do proprietário):** o item resolvido vai inteiro para quem marcou no Trello, e a equipe combina que cada um marca o que resolveu. O cartão sem checklist, e o item sem esse registro, são divididos entre os responsáveis do cartão, para um cartão com vários membros não contar várias vezes. O cartão não vai para quem o concluiu, porque encerrar cartão costuma ser ato de gestão: 12 cartões encerrados pelo proprietário iriam para ele. Quem concluiu fica guardado em `concluido_por_id`. Marcar não prova quem executou. A constante `CREDITO_POR_QUEM_MARCOU` devolve os itens aos responsáveis.
   - **Sem responsável:** fica no fim da lista, sem posição, e fora dos totais e das listas, para não mascarar a eficiência da equipe.
   - **Painel sem posições (decisão do proprietário):** a ordem é pelas tarefas resolvidas. A taxa de resolução foi testada e descartada: percentual sobre a carga premia quem tem pouca tarefa, e quem mais entregava aparecia atrás. Pendente é carga, não falha. O objetivo é estimular sem criar disputa. A tela principal responde: quanto cada um resolve, em quanto tempo, se estamos evoluindo, se a equipe dá conta do que entra (saldo entre entraram e resolvidas) e o que está parado há 14 dias ou mais. Cartões, prazos e o saldo **No prazo** ficam em seção recolhida.
   - **Tempo médio:** da criação à conclusão, em todos os concluídos.
   - **Datas reais:** a conclusão vem do histórico do Trello, em `trello_cartao_datas`, porque `concluida_em` guarda a última atividade. A criação vem do id do cartão.
5. **Leitura:** por quadro, sem uma chamada por cartão.
6. **Credenciais:** comentário ou item com credencial escrita não é copiado (RN-66).
7. **Sem auditoria nestas tabelas:** o texto vem de terceiros. Se uma credencial passar pelo filtro, ela some na sincronização seguinte em vez de ficar na auditoria imutável.
8. **Gravação nova:** o sistema pode **criar** cartão a partir de comentário, inclusive em cartão de terceiros, na mesma tela. O comentário e o cartão de origem não mudam. Cada comentário vira cartão uma vez, e a operação fica em `operacoes_externas`.
9. **Nada é excluído nem arquivado no Trello.** Essa regra do ADR 0013 continua valendo.

## Cartões de rotina
Cartões renovados sempre, como pedidos de compra, não têm fim nem prazo. O proprietário os marca no sistema, com auditoria e sem gravar no Trello, para a equipe não alterar o que entra na própria avaliação. Eles saem da eficiência no prazo. Os itens contam na taxa de resolução, como os de qualquer cartão.

## Consequências
- O filtro reconhece padrões como `senha:`. Outro formato de credencial pode passar.
- O cartão novo aparece no sistema na sincronização seguinte.
- Este painel mede volume, não dificuldade: um cartão simples, um complexo e um item de checklist pesam igual. Quem cuida de rotina tende a aparecer mais, por isso **No prazo** fica ao lado.
- Um adiamento legítimo, pedido pelo cliente ou por outra equipe, também conta contra a taxa. O sistema não sabe o motivo da mudança.
- O painel é calculado na hora e varia conforme o período.
- Estender a outro quadro exige alterar `QUADRO_DETALHADO` e `QUADRO_EQUIPE`.
