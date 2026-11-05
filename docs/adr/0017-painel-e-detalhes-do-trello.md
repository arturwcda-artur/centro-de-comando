# ADR 0017 — Painel da equipe e detalhes do cartão do Trello
**Status:** Aceita · **Data:** 2026-11-05 · Altera o ADR 0013

## Contexto
O proprietário quer medir a eficiência da equipe, ver checklists e comentários dos cartões e transformar um comentário em cartão novo sem sair do sistema. Ele limitou essas funções ao quadro **Obras do Grupo - C.SALLES**.

## Decisão
1. **Escopo:** só esse quadro (`QUADRO_DETALHADO`). Os outros quadros continuam como estavam.
2. **Responsáveis reais:** `trello_membros` e `tarefa_membros`, fora de `pessoas`. O campo `responsavel_id` não muda, então Meu dia e conclusão continuam iguais.
3. **Arquivados:** entram se estavam concluídos, para não prejudicar quem arquiva o que termina. Os demais ficam de fora da contagem.
4. **Contagem:** cartão com dois membros conta para os dois. A conclusão conta para quem estava atribuído.
   - **Taxa de eficiência:** concluídos até a **primeira** data de entrega, divididos pelos concluídos com prazo mais os vencidos em aberto (decisão do proprietário). Adiar a data não melhora a taxa, e cada mudança aparece em **Prazos alterados**.
   - **Unidade de tarefa (decisão do proprietário):** cada item de checklist vale 1, e o cartão sem checklist vale 1. Cartão concluído resolve todos os seus itens.
   - **Crédito do item:** vai para quem o marcou no Trello. Sem esse registro, fica com o membro do item e, depois, com os membros do cartão. Marcar não prova quem executou: quem marca por outra pessoa leva o crédito.
   - **Ranking:** pela **taxa de resolução** (RN-49c), que cobre todo o trabalho, porque a base de prazo é pequena. No empate, fica à frente quem carrega mais tarefas.
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
- Este painel mede volume, não dificuldade: um cartão simples, um complexo e um item de checklist pesam igual. Quem cuida de rotina tende a subir no ranking, por isso a eficiência no prazo fica ao lado.
- A taxa de resolução não penaliza atraso.
- Um adiamento legítimo, pedido pelo cliente ou por outra equipe, também conta contra a taxa. O sistema não sabe o motivo da mudança.
- O ranking é calculado na hora e varia conforme o período. O histórico da posição de cada pessoa não fica guardado.
- Estender a outro quadro exige alterar `QUADRO_DETALHADO` e `QUADRO_EQUIPE`.
