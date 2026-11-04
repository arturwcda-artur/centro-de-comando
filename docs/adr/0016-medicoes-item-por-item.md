# ADR 0016 — Medições item por item, lidas da planilha
**Status:** Aceita · **Data:** 2026-11-04 · Detalha o ADR 0002

## Contexto
As medições são feitas em planilhas Excel, com modelos diferentes em cada obra. O proprietário quer ver o saldo de cada serviço, e o valor medido do contrato só pode contar medições aprovadas (RN-12).

## Decisão
1. **Detalhe:** cada medição guarda os serviços medidos, com quantidade e valor.
2. **Leitura:** o agente lê com `openpyxl`, sem abrir o Excel, e só relê a planilha que mudou.
3. **Modelos:** cada modelo é uma função em `cc_agente/medicoes.py`. O primeiro é `mascara_medicoes`, da PRF. Planilha fora do modelo é recusada, e nada é gravado.
4. **Situação:** a medição entra como `elaborada`, e só o proprietário muda. A planilha só atualiza medições elaboradas.
5. **Planilha alterada depois do envio:** a medição não muda, e a diferença fica em `diferenca_planilha`. Para aceitar, o proprietário volta a medição para elaborada e roda o atalho.
6. **Saldo por serviço:** conta toda medição não cancelada, porque serve para preparar a próxima. O valor medido do contrato conta só as aprovadas.
7. **Arredondamento:** cada serviço é arredondado em 2 casas antes da soma, como na planilha.
8. **Acesso:** o agente usa o papel `agente_cronograma`, que ganha só três funções novas.
9. **Contrato, aditivos e financeiro:** digitados na tela, a partir dos documentos oficiais.
10. **Planejamento:** com medições aprovadas antes do início do vigente, o valor anterior da Curva S vem delas. O valor digitado fica como reserva.

## Alternativas descartadas
- **Só o total de cada medição:** o detalhe por serviço ficaria apenas na planilha.
- **Importar o contrato da planilha:** a planilha não traz número, datas nem aditivos confiáveis.

## Consequências
- Cada novo modelo de planilha exige programar uma nova função.
- Os serviços vêm da planilha, então a soma pode diferir do valor contratado. A tela mostra a diferença.
- Item que some da planilha continua no sistema.
- A planilha precisa ter sido salva pelo Excel, porque o agente lê os valores calculados guardados no arquivo.
