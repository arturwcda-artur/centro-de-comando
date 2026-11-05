# ADR 0019 — Relatórios internos em PDF e Excel
**Status:** Aceita · **Data:** 2026-11-05

## Contexto
O proprietário precisa apresentar os números à equipe e acompanhar as obras. Os relatórios são só de uso interno.

## Decisão
1. **PDF pela impressão do navegador:** cada relatório é uma página preparada para A4, com o botão **Salvar em PDF**.
2. **Excel no servidor:** o relatório de medições e contrato usa `exceljs`, com valores e datas reais.
3. **Mesma leitura das telas:** `carregarCartoesEquipe`, `montarPainelEquipe` e `carregarPlanejamentoObra` servem à tela e ao relatório.
4. **Nada é guardado nem enviado:** cada relatório é gerado quando o proprietário pede.

## Alternativas descartadas
- **Biblioteca de PDF no servidor:** exigiria refazer gráficos e tabelas, com risco de números e aparência divergirem.
- **Serviço externo de PDF:** custo e dados saindo do sistema.

## Consequências
- Salvar o PDF exige um clique a mais, na janela de impressão.
- O resultado depende um pouco do navegador. Chrome e Edge são a referência.
- Todo relatório leva **Uso interno**. Uma versão para o contratante exige novo desenho.
