# ADR 0023 — Problemas no sistema

- **Data:** 2026-11-13
- **Status:** aceita
- **Substitui em parte:** ADR 0022, na fonte do plano de ações

## Contexto

O ADR 0022 trouxe o plano de ações da planilha da Central de Gestão para o sistema, só para leitura. No uso, o proprietário achou a planilha confusa: ela não prioriza nem organiza os problemas. Ele decidiu produzir esse conteúdo no próprio sistema.

## Decisão

1. **Fonte:** os problemas e os planos 5W2H passam a ser cadastrados no Centro de Comando. A planilha deixa de ser lida.
2. **Problema:** título, obra, responsável e notas G, U e T de 1 a 5, nas frases da planilha GUT 4.0 do proprietário. O GUT é calculado no banco.
3. **Ação 5W2H:** é uma tarefa comum, ligada ao problema por `tarefas.problema_id`, com o 5W2H em `acoes_detalhes`. Assim ela aparece em Tarefas, Meu dia e nos alertas sem duplicar dados.
4. **Importação única:** as 48 ações lidas da planilha da NILLS viram 48 problemas, cada um com a sua ação. As tarefas passam a `fonte = 'manual'`, editáveis no sistema.
5. **Etapas seguintes**, não incluídas aqui: tela "um problema por vez" com a triagem do Seletor de Técnicas, e as técnicas preenchidas no sistema.

## Consequências

- Uma fonte só para os problemas, como pede a regra do projeto.
- A leitura `cc_agente.acoes` fica sem planilha cadastrada; o código continua no agente, caso a decisão volte atrás.
- As mudanças feitas na planilha depois da importação não chegam ao sistema.
