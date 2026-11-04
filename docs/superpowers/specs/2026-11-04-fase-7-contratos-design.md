# Fase 7 — Contratos e financeiro: especificação
**Data:** 2026-11-04 · **Piloto:** PRF-Recanto · **Desenho aprovado pelo proprietário em:** 2026-11-04

## Objetivo
Controlar contrato, aditivos, medições item por item e lançamentos financeiros de cada obra, mantendo separados os valores contratado, medido, faturado e recebido (RN-10 a RN-16).

## Decisões já tomadas
| Assunto | Decisão |
|---|---|
| Detalhe das medições | Item por item |
| Contrato e aditivos | Digitados na tela, a partir dos documentos oficiais |
| Medições | Lidas da planilha pelo agente, em modo somente leitura |
| Situação da medição | Entra como `elaborada`. Só o proprietário muda |
| Financeiro | Digitado na tela |
| Modelo piloto | Planilha da PRF, abas Máscara e Medições |
| Arquivo piloto | `05_Medicoes/1º_Medição_PRF.xlsx` |

## Fora do escopo
- Gerar ou preencher planilhas de medição.
- Modelos de planilha de outras obras. Cada um entra depois, um por vez.
- Itens dos aditivos: entram só os totais.
- Financeiro da empresa (decisão D7 da Fase 0).

## Componentes

### 1. Banco (migration 0020)
Tabelas novas, todas com `app.aplicar_padroes`:

**`medicao_arquivos`**: `contrato_id`, `modelo` (hoje só `mascara_medicoes`), `caminho`, `ultimo_hash`, `ultima_leitura_em`, `ultimo_erro`.

**`contrato_itens`**: serviços do contrato vindos da planilha.

| Coluna | Uso |
|---|---|
| `contrato_id` | contrato |
| `item` | código do item na planilha, único por contrato |
| `descricao`, `unidade` | texto do serviço |
| `quantidade`, `preco_unitario`, `valor_total` | valores contratados |

**`medicao_itens`**: quanto cada medição mediu de cada serviço.

| Coluna | Uso |
|---|---|
| `medicao_id`, `item_id` | medição e serviço, únicos juntos |
| `quantidade` | quantidade medida no período |
| `valor` | quantidade × preço unitário |

Só entram linhas com quantidade diferente de zero.

**Alteração em `medicoes`:** colunas `data_medicao date` e `diferenca_planilha numeric(14,2)`. A segunda fica preenchida quando a planilha muda depois do envio.

**View `v_contrato_itens_saldo`** (`security_invoker = on`): por item, quantidade e valor do contrato, medido acumulado, saldo e `acima_do_contrato`. Considera as medições que não estão canceladas, porque o saldo serve para preparar a próxima medição.

### 2. Agente (`agente-local/cc_agente/medicoes.py`)
Lê com `openpyxl` (`read_only=True`, `data_only=True`), sem abrir o Excel. Para cada arquivo cadastrado:
1. Calcula o SHA-256. Se for igual ao `ultimo_hash`, passa para o próximo.
2. Aplica o modelo do arquivo.
3. Envia tudo em uma única chamada.

**Modelo `mascara_medicoes` (aba `Medições`):**
- Linha 13 é o cabeçalho. Os itens começam na linha 14.
- Colunas: A item, C descrição, D quantidade, E unidade, F preço unitário, G total.
- A coluna J é `MED.00`, e cada medição seguinte fica uma coluna à direita.
- Linha 3: número da medição. Linha 4: data. Linhas 5 e 6: período.
- Uma medição existe quando as linhas 5 e 6 estão preenchidas.
- Linhas sem descrição e a linha de total são ignoradas.
- `MED.00` é ignorada se não tiver data.
- Se a aba ou o cabeçalho não forem os esperados, o arquivo é recusado com erro claro, e nada é gravado.

O atalho **Atualizar cronogramas** passa a chamar também as medições, e o texto dele muda para atualizar cronogramas e medições. O nome do arquivo `.cmd` e o agendamento continuam os mesmos. A falha de um não impede o outro.

### 3. Envio ao banco
- Funções novas, liberadas ao papel existente `agente_cronograma`, sem senha nova: `listar_medicoes_agente()`, `registrar_erro_medicao(p_arquivo, p_erro)` e `importar_medicoes(payload jsonb)`.
- O papel continua sem ler ou gravar tabelas diretamente.
- `importar_medicoes` roda em uma transação. Reenviar o mesmo arquivo não muda nada (RN-61).
- `contrato_itens` é atualizado por `(contrato_id, item)`. Um item que some da planilha não é apagado.

**Regra por medição:**

| Situação da medição | Efeito da importação |
|---|---|
| Não existe | Cria como `elaborada`, com `fonte = planilha` |
| `elaborada` | Atualiza valores e itens |
| `enviada`, `aprovada` ou `glosada` | Não altera. Se o valor mudou, grava `diferenca_planilha` |
| `cancelada` | Não altera |

Quando o valor volta a ser igual, `diferenca_planilha` é limpa.

### 4. Tela Contratos e financeiro
**`/contratos`:** lista por obra, com contratado, medido, saldo a medir e recebido, usando `v_contratos_resumo`.

**`/contratos/novo` e `/contratos/[id]/editar`:** formulário do contrato.

**`/contratos/[id]`:**
- **Resumo:** contratado, prazo vigente, medido, faturado, recebido, saldo a medir e saldo a receber.
- **Aditivos:** lista e formulário.
- **Medições:** lista com número, período, valor, glosa e situação, com formulário para situação, datas e glosa.
- **Serviços:** saldo por item, com busca e filtro para itens acima do contrato.
- **Lançamentos:** lista e formulário com tipo, valor, datas, nota fiscal e medição.
- **Planilha:** caminho do arquivo, última leitura e erro.

O caminho da planilha é informado no contrato. A PRF-Recanto recebe o caminho sugerido ao abrir o formulário.

**Avisos na tela:**
- Soma dos itens diferente do valor contratado.
- Item medido acima do contrato.
- Planilha alterada depois da aprovação, com a diferença em reais.
- Arquivo não encontrado ou leitura com erro.
- Última leitura com mais de 7 dias.

### 5. Ligação com o Planejamento
- **Valor anterior:** quando houver medições aprovadas com `periodo_fim` antes do início do cronograma vigente, o valor anterior da Curva S é a soma delas (valor medido menos glosa). O valor digitado na Fase 6 fica como reserva, e a tela informa qual dos dois está em uso.
- **Contrato:** o aviso de total passa a comparar com o valor contratado, incluindo os aditivos aprovados.

## Segurança
- O agente só lê a planilha.
- O papel do agente ganha apenas as três funções novas.
- Valores ficam no banco protegido por RLS, com segundo fator.

## Testes
- **Agente (pytest):** planilha de teste criada no próprio teste, cobrindo itens, medições, linhas ignoradas, modelo inválido, hash igual, arquivo ausente e falha isolada.
- **Banco (PGlite):** importação idempotente, criação como `elaborada`, medição aprovada preservada, `diferenca_planilha`, saldo por item, item acima do contrato e limites do papel.
- **Web (vitest):** validação dos formulários, avisos e escolha do valor anterior.
- **Teste real:** a 1ª medição da PRF deve entrar com R$ 63.884,16 bruto, período de 06/04/2026 a 15/04/2026 e data de 06/05/2026.

## Critérios de pronto
1. Depois de cadastrar o contrato, a primeira leitura importa os itens e a 1ª medição, e a segunda não muda nada.
2. O arquivo `.xlsx` não muda de data nem de conteúdo.
3. A tela mostra os valores separados e o saldo por serviço.
4. Aprovar a medição muda o valor medido e o valor anterior do Planejamento.
5. Uma medição aprovada não é sobrescrita pela planilha.
6. ADR 0016, regras novas, documentação, dicionário e CHANGELOG atualizados.

## Passos do proprietário
1. Cadastrar o contrato da PRF-Recanto e confirmar o caminho da planilha.
2. Rodar o atalho.
3. Informar a situação da 1ª medição.
4. Cadastrar os aditivos e, se quiser, os lançamentos.
