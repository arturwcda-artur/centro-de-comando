# Fase 8, parte 2 — Relatórios: especificação
**Data:** 2026-11-05 · **Uso:** interno · **Piloto:** PRF-Recanto e quadro Obras do Grupo - C.SALLES

## Objetivo
Gerar, com um clique, relatórios para reuniões e para o financeiro, usando os mesmos números das telas, sem digitar nada de novo.

## Decisões já tomadas
| Assunto | Decisão |
|---|---|
| Relatórios | KPI da equipe, Situação da obra e Medições e contrato |
| Destino | Só uso interno. Todos levam a marca **Uso interno** |
| Geração | Só quando o proprietário pede. Nada é enviado sozinho |

## Fora do escopo
- Versão para o contratante.
- Envio por e-mail e relatórios agendados.
- Montar relatório escolhendo campos.

## Componentes

### 1. Tela Relatórios (`/relatorios`)
Três cartões, um por relatório. O relatório de obra pede a obra. O KPI pede o período: Último mês, Última semana ou Todo o período.

### 2. PDF por página de impressão
Cada relatório em PDF é uma página do sistema preparada para papel A4. Ela abre em nova aba com o botão **Salvar em PDF**, que chama a impressão do navegador.

Motivos:
- Reaproveita as mesmas funções e o mesmo gráfico das telas, então os números não divergem.
- Não acrescenta biblioteca nem processamento no servidor, o que mantém o plano gratuito folgado.
- Funciona no computador e no celular.

O custo é um clique a mais, na janela de impressão, para escolher **Salvar como PDF**.

### 3. KPI da equipe (`/relatorios/equipe`)
PDF de 1 página:
- Período, data de geração e fonte: Trello, última sincronização.
- Tarefas resolvidas, Entraram, Saldo, Tempo médio e Evolução.
- Quem resolveu, com Tarefas resolvidas, Tempo médio e Evolução.
- Entraram × resolvidas por semana.
- Cartões parados, até 5.

O cálculo é o de `apps/web/src/lib/equipe.ts`. A tela e o relatório usam uma única função para carregar os dados, `carregarCartoesEquipe`.

### 4. Situação da obra (`/relatorios/obra/[id]`)
PDF de 1 a 2 páginas:
- Obra, data de geração e última leitura dos cronogramas e das medições.
- **Prazo:** início, término previsto, limite contratual, folga e diferença para a linha de base.
- **Curva S:** o mesmo gráfico do Planejamento.
- **Contrato:** contratado, medido, faturado, recebido, saldo a medir e saldo a receber.
- **Medições:** número, período, valor e situação.
- **Aditivos:** número, tipo, valor, dias e situação.
- **Riscos abertos:** os 5 de maior severidade.
- **Tarefas:** abertas e vencidas da obra.
- **Avisos:** os mesmos das telas de Planejamento e Contratos.

Seção sem dados aparece com a frase **Sem dados cadastrados**, para não parecer que foi esquecida.

### 5. Medições e contrato em Excel (`/api/relatorios/contrato/[id]`)
Arquivo `.xlsx`, gerado no servidor com a biblioteca `exceljs`, com sessão completa exigida. Abas:
- **Resumo:** valores do contrato e aviso de diferenças.
- **Medições:** todas, com situação, datas, valor e glosa.
- **Saldo por serviço:** item, serviço, unidade, contrato, medido, saldo e valor do saldo.
- **Aditivos** e **Lançamentos**.

Valores em R$ e datas como data real da planilha, para o usuário poder somar e filtrar.

## Segurança
- Rotas e páginas exigem sessão com segundo fator.
- Nada fica guardado: cada relatório é gerado na hora.
- Texto vindo do banco que comece com `=`, `+`, `-` ou `@` entra na planilha como texto, para o Excel não executar como fórmula.
- Todo relatório leva **Uso interno** e a data de geração.

## Testes
- **Web (vitest):** montagem do Excel com abas e valores, proteção contra fórmula e seções vazias.
- **Teste real:** gerar os três relatórios da PRF-Recanto e conferir que os números batem com as telas.

## Critérios de pronto
1. Os três relatórios são gerados pela tela Relatórios.
2. O KPI cabe em 1 página A4, e a Situação da obra em até 2.
3. Os números batem com as telas Equipe, Planejamento e Contratos.
4. O Excel abre sem aviso, com valores somáveis.
5. ADR 0019, documentação e CHANGELOG atualizados.

## Passos do proprietário
Conferir os três relatórios e usar o KPI na conversa com a equipe.
