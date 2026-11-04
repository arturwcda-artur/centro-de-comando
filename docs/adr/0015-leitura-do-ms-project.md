# ADR 0015 — Leitura do MS Project e Curva S em reais
**Status:** Aceita · **Data:** 2026-11-04 · Detalha o ADR 0002

## Contexto
O MS Project é a fonte oficial do cronograma (RN-65) e só existe no computador do proprietário. A Curva S da PRF-Recanto compara cronogramas com bases diferentes: a linha de base cobre a obra desde abril de 2026, e a REV-02 cobre só o que faltava na retomada.

## Decisão
1. **Leitura:** o agente abre cada `.mpp` por COM em modo somente leitura e fecha sem salvar. Só relê um arquivo se o hash mudou.
2. **Project em uso:** se o Project estiver aberto, o agente não lê nada, avisa e termina. Ele só fecha a instância que abriu.
3. **Acesso restrito:** o agente usa o papel de banco `agente_cronograma`, que só executa três funções. A senha fica em `agente.env`.
4. **Versões:** cada conteúdo novo gera uma versão. O vigente anterior vira histórico.
5. **Linha de base:** nunca é trocada sozinha. Um arquivo alterado entra como reprogramação, e a troca é uma ação do proprietário.
6. **Curva S:** em reais acumulados, com o custo de cada atividade dividido igualmente pelos dias corridos, em pontos semanais.
7. **Ponto de partida:** a curva vigente começa no valor executado antes da retomada, informado pelo proprietário até a Fase 7 trazer as medições.
8. **Realizado:** valor anterior somado a custo vezes percentual, um ponto por versão lida.
9. **Gráfico:** SVG feito no próprio sistema, sem biblioteca nova.

## Alternativas descartadas
- **Curva em percentual:** com totais diferentes, 50% de uma curva não equivale a 50% da outra.
- **Peso por duração ou por trabalho:** a REV-02 não tem horas de trabalho, e a duração ignora o valor de cada serviço.
- **Chave de serviço do Supabase no computador:** daria acesso a todas as tabelas.

## Consequências
- O realizado só anda quando o avanço é atualizado no `.mpp`.
- A distribuição linear é uma aproximação: o custo real de uma atividade pode não ser uniforme.
- O valor anterior é digitado e precisa de conferência até a Fase 7.
- Enquanto não houver contrato cadastrado, a tela compara os totais da linha de base e do vigente, mas não os compara com o contrato.
- Os marcos da tabela `marcos` vêm só do cronograma vigente.
