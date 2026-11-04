# Fase 6 — Planejamento: especificação
**Data:** 2026-11-04 · **Piloto:** PRF-Recanto · **Desenho aprovado pelo proprietário em:** 2026-11-04

## Objetivo
Ler os cronogramas do MS Project, guardar suas versões e mostrar no sistema o prazo, as atividades e a Curva S da obra, sem alterar nenhum arquivo `.mpp` (RN-65).

## Decisões já tomadas
| Assunto | Decisão |
|---|---|
| Cronograma vigente da PRF-Recanto | `17_Plano_de_Retomada/PLANO_RETOMADA_PRF_REV02.mpp` |
| Linha de base da PRF-Recanto | `01_Planejamento_e_Cronograma/01-PLANEJAMENTO/planejamento valido/enviado-prf/PLANEJAMENTO-PRF-FINAL.mpp` |
| Histórico | Os dois arquivos de março/2026 em `planejamento valido` |
| Peso da Curva S | Custo de cada atividade |
| Unidade da Curva S | Reais acumulados |
| Escopo da REV-02 | Só o que faltava na retomada. A curva vigente começa no valor executado antes da paralisação |
| Obras nesta fase | Só a PRF-Recanto. As demais entram depois, por cadastro, sem programação nova |

## Fora do escopo
- Gravar qualquer coisa no MS Project.
- Importar medições e contratos (Fase 7).
- Curva S por recursos ou equipes.

## Componentes

### 1. Registro de arquivos (migration 0019)
Tabela nova `cronograma_arquivos`, uma linha por arquivo acompanhado:

| Coluna | Uso |
|---|---|
| `obra_id` | obra do arquivo |
| `papel` | `vigente`, `linha_base` ou `historico` |
| `caminho` | caminho completo no computador |
| `ultimo_hash` | SHA-256 do arquivo na última leitura |
| `ultima_leitura_em` | quando foi lido |
| `ultimo_erro` | mensagem da última falha, ou vazio |
| `valor_executado_anterior` | só no vigente: valor executado antes da retomada |
| `data_executado_anterior` | data de referência desse valor |

Alterações nas tabelas atuais:
- `atividades_cronograma`: nova coluna `custo numeric(14,2)`.
- `cronograma_versoes`: nova coluna `arquivo_id`, referência a `cronograma_arquivos`.

As novas tabelas usam `app.aplicar_padroes`, com RLS exigindo o proprietário com segundo fator.

### 2. Agente local (`agente-local/cc_agente/cronogramas.py`)
Para cada arquivo cadastrado:
1. Calcula o SHA-256 sem abrir o Project. Se for igual ao `ultimo_hash`, passa para o próximo.
2. Abre o arquivo com `FileOpenEx(caminho, ReadOnly=True)`, com o Project invisível e sem alertas.
3. Lê projeto, atividades, dependências e marcos. Valores `ND` e `NA` viram vazio.
4. Fecha sem salvar e envia tudo em uma única chamada ao banco.

Regras de operação:
- **Project aberto pelo usuário:** o agente não abre, não fecha e não interfere. Registra o aviso e termina. Ele só fecha a instância que ele mesmo abriu.
- **Arquivo ausente:** grava `ultimo_erro` e segue para o próximo.
- **Falha de um arquivo:** não interrompe os outros.
- **Execução:** atalho **Atualizar cronogramas** na Área de Trabalho e tarefa semanal criada pelo proprietário.
- **Dependências novas:** `pywin32` e `psycopg`.
- **Log:** `cronogramas.log` na pasta de configuração do agente, sem senha.

A parte que fala com o Project fica separada do tratamento dos dados, para permitir testes sem o Project instalado.

### 3. Envio ao banco
- Função `public.importar_cronograma(payload jsonb)`, em uma única transação: ou entra a versão inteira, ou nada entra.
- `id_externo` da versão é o hash do arquivo, então reenviar o mesmo arquivo não duplica (RN-61).
- **Vigente:** a versão nova vira `vigente`, e a anterior passa a `historico`.
- **Linha de base:** a primeira leitura grava. Se o arquivo mudar depois, a versão entra como `reprogramacao` e a tela avisa. **A linha de base nunca é trocada sozinha.** A troca é uma ação do proprietário na tela.
- **Marcos:** os do Project são atualizados em `marcos` por obra e nome. O marco cujo nome contém "limite contratual" recebe `contratual = true` e `data_contratual`.
- **Acesso:** papel de banco próprio, `agente_cronograma`, que só pode executar `importar_cronograma`, ler `cronograma_arquivos` e registrar erro de leitura. A senha é definida pelo proprietário, fica em `agente.env` e nunca vai para o GitHub.

### 4. Curva S (`apps/web/src/lib/curva-s.ts`)
Função pura, calculada ao abrir a tela:
- Considera só atividades que não são resumo.
- **Previsto:** distribui o custo de cada atividade igualmente pelos dias corridos entre início e término. Atividade de um dia só, ou marco com custo, cai inteira na data.
- **Pontos:** um por semana, do início ao fim da curva.
- **Linha de base:** soma acumulada, começando em R$ 0.
- **Vigente:** soma acumulada, começando em `valor_executado_anterior`.
- **Realizado:** para cada versão do vigente, `valor_executado_anterior + soma(custo × percentual)`, na data da leitura.

Se `valor_executado_anterior` estiver vazio, a tela pede o valor e mostra a curva vigente começando em zero, com aviso.

### 5. Tela Planejamento (`/planejamento`)
- **`/planejamento`:** lista das obras com cronograma cadastrado.
- **`/planejamento/[obra]`:**
  - Resumo: início, término previsto, avanço, diferença de prazo para a linha de base e folga até o limite contratual.
  - Curva S em reais, em SVG feito no próprio sistema, sem biblioteca nova.
  - Atividades, com filtros para caminho crítico e atrasadas.
  - Versões e arquivos, com data da última leitura e último erro.
  - Formulário do valor executado antes da retomada, com a data de referência.
  - Ação **Tornar linha de base**, com confirmação, numa versão `reprogramacao`.

Atrasada significa: término previsto antes de hoje e percentual abaixo de 100.

**Avisos na tela:**
- Total do cronograma diferente do valor do contrato ou do escopo cadastrado.
- Atividades sem custo, com a quantidade.
- Arquivo não encontrado ou leitura com erro.
- Arquivo da linha de base alterado.
- Última leitura com mais de 7 dias.

O menu já tem o módulo Planejamento, que passa a abrir esta tela. `FASE_ATUAL` muda para 6.

## Carga inicial da PRF-Recanto
Os quatro arquivos entram na migration de carga apenas como cadastro (caminho e papel), sem nenhum dado do cronograma. Os dados chegam pela primeira execução do agente.

## Segurança
- O agente só abre arquivos em modo somente leitura.
- O papel `agente_cronograma` não lê nem grava nenhuma outra tabela.
- Nomes de atividades e custos ficam no banco protegido por RLS. Nada é exposto em página pública.

## Testes
- **Agente (pytest):** Project simulado, cobrindo hash igual, `ND`/`NA`, Project já aberto, arquivo ausente e falha isolada.
- **Banco (PGlite):** importação idempotente, troca de vigente, linha de base preservada, transação sem carga parcial e limites do papel `agente_cronograma`.
- **Web (vitest):** Curva S com distribuição por dias, partida no valor anterior, atividade de um dia, resumo ignorado e atrasadas.
- **Teste real:** o proprietário roda o atalho, e a REV-02 deve mostrar 47 atividades, R$ 2.587.261,70 e término em 08/04/2027.

## Critérios de pronto
1. A primeira execução importa os 4 arquivos, e a segunda não cria nenhuma versão.
2. Nenhum `.mpp` muda de data ou de conteúdo depois da leitura.
3. A tela mostra a Curva S da PRF-Recanto com as três linhas.
4. Alterar a REV-02 gera uma nova versão vigente na execução seguinte.
5. ADR 0015, RN nova, documentação, dicionário e CHANGELOG atualizados.

## Passos do proprietário
1. Definir a senha do papel `agente_cronograma` e gravá-la em `agente.env`, com passo a passo.
2. Rodar o atalho **Atualizar cronogramas**.
3. Informar o valor executado antes da retomada.
4. Criar a tarefa semanal no Agendador do Windows.
