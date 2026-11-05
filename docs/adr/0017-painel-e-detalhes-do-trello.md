# ADR 0017 — Painel da equipe e detalhes do cartão do Trello
**Status:** Aceita · **Data:** 2026-11-05 · Altera o ADR 0013

## Contexto
O proprietário quer medir a eficiência da equipe, ver checklists e comentários dos cartões e transformar um comentário em cartão novo sem sair do sistema. Ele limitou essas funções ao quadro **Obras do Grupo - C.SALLES**.

## Decisão
1. **Escopo:** só esse quadro (`QUADRO_DETALHADO`). Os outros quadros continuam como estavam.
2. **Responsáveis reais:** `trello_membros` e `tarefa_membros`, fora de `pessoas`. O campo `responsavel_id` não muda, então Meu dia e conclusão continuam iguais.
3. **Arquivados:** entram se estavam concluídos, para não prejudicar quem arquiva o que termina. Os demais ficam de fora da contagem.
4. **Contagem:** cartão com dois membros conta para os dois. A conclusão conta para quem estava atribuído, e a data é a da última atividade do cartão.
5. **Leitura:** por quadro, sem uma chamada por cartão.
6. **Credenciais:** comentário ou item com credencial escrita não é copiado (RN-66).
7. **Sem auditoria nestas tabelas:** o texto vem de terceiros. Se uma credencial passar pelo filtro, ela some na sincronização seguinte em vez de ficar na auditoria imutável.
8. **Gravação nova:** o sistema pode **criar** cartão a partir de comentário, inclusive em cartão de terceiros, na mesma tela. O comentário e o cartão de origem não mudam. Cada comentário vira cartão uma vez, e a operação fica em `operacoes_externas`.
9. **Nada é excluído nem arquivado no Trello.** Essa regra do ADR 0013 continua valendo.

## Consequências
- O filtro reconhece padrões como `senha:`. Outro formato de credencial pode passar.
- O cartão novo aparece no sistema na sincronização seguinte.
- Este painel mede volume, não dificuldade: um cartão simples e um complexo pesam igual.
- Estender a outro quadro exige alterar `QUADRO_DETALHADO` e `QUADRO_EQUIPE`.
