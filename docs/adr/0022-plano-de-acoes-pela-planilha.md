# ADR 0022 — Plano de ações da obra lido da Central de Gestão
**Status:** Proposta · **Data:** 2026-11-10 · Complementa os ADRs 0002, 0004 e 0016

## Contexto
O plano de ações de cada obra (5W2H, GUT, PDCA, dependências e gates de liberação) fica na planilha da Central de Gestão da obra, aba AÇÕES (ex.: `NILLS-CTL-002_R01_Central_de_Gestao.xlsx`). O proprietário precisa ver essas ações no Centro de Comando, junto das demais tarefas, porque delas saem as ações efetivas na obra.

## Decisão
1. **Fonte oficial:** a planilha. O Centro de Comando só mostra e prioriza; não grava nada de volta (mesma regra das medições, ADR 0016).
2. **Leitura:** `cc_agente.acoes`, no agente local, com openpyxl, sem abrir o Excel. Só relê a planilha que mudou (hash). Colunas achadas pelo nome do cabeçalho na linha 5.
3. **Destino:** tabela `tarefas` com `fonte = 'planilha'` e `id_externo = <obra>:<Nº>`. O Nº é a linha da ação (regra `=ROW()-5` da planilha).
4. **Mapeamento:** Restrição → `pendencia`, demais tipos → `acao`; G → `importancia`, T → `impacto`; GUT ≥ 64 → `critica`; Frente e responsável da planilha → `categoria`; Por quê, Onde, Como, Quanto, Evidência, PDCA e Prazo original → `descricao`; "Depende das ações Nº" → `tarefa_dependencias`. O responsável é ligado à pessoa cadastrada pelo primeiro nome, só quando há uma única correspondência; sem ela, a ação fica sem responsável e entra em "Minhas atribuições" (RN-45).
4a. **Notas e 5W2H separados:** G, U, T e as respostas do 5W2H também ficam em `acoes_detalhes`, um registro por ação, para a Matriz GUT. O GUT é calculado no banco.
5. **Ação que sai da planilha** não é apagada: fica com `status_sync = 'pendente'` e é sinalizada na obra e na tarefa.
6. **Frequência:** de hora em hora, por tarefa própria do Agendador (`agendar-plano-de-acoes.cmd`), além da leitura semanal geral.

## Consequências
- Apagar ou mover linhas na aba AÇÕES muda o Nº das ações seguintes. Regra da planilha: não apagar linha; encerrar com o status Cancelada.
- A leitura usa o mesmo papel restrito do agente (`agente_cronograma`) e registra a execução em Integrações como `excel`.
