# Regras de Negócio

Cada regra tem um identificador (RN-xx) para ser citada em código, testes e ADRs. Onde a regra é calculada em SQL, a view correspondente está indicada.

## 1. Obras
- **RN-01** Situações possíveis: `planejamento`, `andamento`, `paralisada`, `aguardando`, `concluida`, `cancelada`.
- **RN-02** Cada obra pertence a uma **empresa executora** (pela qual o gestor atua) e a um **contratante**. São entidades diferentes.
- **RN-03** Valores e avanços da obra **não são digitados na obra**. Eles vêm de contratos, aditivos, medições e avanço físico (`v_obra_resumo`).
- **RN-04** Nenhuma obra é cadastrada a partir de suposições. O cadastro inicial é assistido e confirmado pelo usuário.
- **RN-05** Importação assistida: o agente local só **lê** as pastas `2.1-EM ANDAMENTO` (sugere `andamento`), `2.2-AGUARDANDO` (`aguardando`) e `2.3-FINALIZADAS` (`concluida`). Cada pasta gera uma **proposta**. A obra só existe depois que o proprietário aprova, e cada proposta pode ser corrigida ou descartada.
- **RN-06** Pastas agrupadoras (hoje: `LEVORSSE`) geram uma proposta por subpasta, ou seja, por frente de obra. Pastas que provavelmente não são obras (`PEDIDOS GERAIS`) vêm marcadas, mas não são descartadas automaticamente.
- **RN-07** Reler as pastas atualiza só as evidências da proposta (contagens, tamanho, data). As sugestões e a revisão do proprietário são preservadas.
- **RN-08** O código da obra é único, em maiúsculas, com letras, números e hífen. Pastas com o mesmo nome recebem a situação como sufixo (ex.: `MIRANTE-CONCLUIDA`).
- **RN-09** Ao aprovar com empresa ou contratante digitados, o sistema reaproveita um cadastro com o mesmo nome antes de criar outro.
- **RN-10a** Obras e cadastros não são apagados pela interface, apenas **arquivados** (`arquivado_em`). O histórico e a auditoria permanecem.

## 2. Contratos e financeiro — separação de valores (`v_contratos_resumo`)
| Conceito | Regra |
|---|---|
| **RN-10 Valor contratado** | valor original + Σ `valor_delta` dos aditivos **aprovados** |
| **RN-11 Prazo vigente** | data de término original + Σ `dias_delta` dos aditivos **aprovados** |
| **RN-12 Valor medido** | Σ (valor medido − glosa) das medições **aprovadas** (ou aprovadas com glosa) |
| **RN-13 Valor faturado** | Σ lançamentos `faturamento` com data efetiva |
| **RN-14 Valor recebido** | Σ lançamentos `recebimento` com data efetiva |
| **RN-15 Saldo a medir** | contratado − medido |
| **RN-16 Saldo a receber** | faturado − recebido |
| **RN-17 Executado** | % físico realizado × valor contratado (indicador; não substitui medição) |

- **RN-18** Supressão tem `valor_delta` ≤ 0. Acréscimo e reajuste têm valor ≥ 0. Aditivo só de prazo tem valor = 0.
- **RN-19** Aditivos `em_analise` ou `rejeitado` não alteram valor nem prazo.
- **RN-20** O número da medição é único por contrato. A glosa nunca supera o valor medido.
- **RN-21** Moeda única: R$, com 2 casas decimais.
- **RN-22** Medição importada entra como elaborada. Só o proprietário muda a situação.
- **RN-23** A planilha só atualiza medições elaboradas. Depois do envio, a diferença é registrada e mostrada, sem alterar a medição.
- **RN-24** O saldo por serviço conta toda medição não cancelada. O valor medido do contrato conta só as aprovadas (RN-12).

## 3. Prazos e atrasos (`v_obra_resumo`)
- **RN-30** *Dias além do prazo* = max(0, hoje − prazo vigente), só para obras não concluídas e não canceladas.
- **RN-31** *Desvio físico* = % realizado − % previsto da última medição de avanço.
- **RN-32** "Hoje" é sempre a data em America/Sao_Paulo (`app.hoje()`).

## 4. Tarefas e "Meu dia" (`v_tarefas_priorizadas`)
- **RN-40** O sistema **nunca altera prazos automaticamente**. A priorização só ordena as tarefas.
- **RN-41** Urgência, derivada do prazo:

  | Situação do prazo | Urgência |
  |---|---|
  | vencido ou vence hoje | 5 |
  | vence em até 2 dias | 4 |
  | vence em até 7 dias | 3 |
  | vence em até 15 dias | 2 |
  | mais de 15 dias ou sem prazo | 1 |

- **RN-42** Importância e impacto: 1 a 5, padrão 3, definidos pelo usuário.
- **RN-43** **Escore = 3·urgência + 2·importância + 2·impacto** (de 7 a 35). Ordenação decrescente.
- **RN-44** Status `aguardando_terceiro` exige indicar de quem se aguarda.
- **RN-45** Visões:

  | Visão | Critério |
  |---|---|
  | Minhas atribuições | responsável é a pessoa marcada `eh_usuario` ("Sou eu" em Cadastros → Pessoas) **ou não há responsável** (migration 0014) |
  | Aguardando terceiros | status `aguardando_terceiro` |
  | Cobranças | tipo `cobranca` |
  | Atividades críticas | `critica = true` ou escore ≥ 27 |
  | Vencimentos | prazo nos próximos 15 dias ou vencido |
  | Concluídas | status `concluida` |

- **RN-45a** A tela Tarefas abre na visão **Todas**, com as tarefas abertas de toda a equipe, e aceita filtro por quadro e por responsável do Trello. **Meu dia** continua mostrando só as tarefas do proprietário.
- **RN-46** **Meu dia** mostra em "foco" as minhas tarefas vencidas, de hoje, críticas ou com escore ≥ 27 (até 8), seguidas das 5 próximas por escore. Cada tarefa vem com o motivo da posição (vencida, vence hoje, crítica, impacto alto…). É uma recomendação: nada é reagendado.
- **RN-47** Tarefas importadas (Trello, Notion) não são editadas no sistema, exceto a conclusão (RN-48) e a criação de cartão a partir de comentário (RN-49). Para as demais alterações, a fonte oficial é a ferramenta de origem.
- **RN-48** Podem ser concluídas pelo sistema: tarefas manuais e cartões do Trello, inclusive os da equipe (desde 25/11/2026: o proprietário administra os quadros). O cartão vai para a lista de concluídos do quadro. A conclusão é gravada primeiro na origem; se a origem recusar, a tarefa continua aberta e o erro aparece na tela. No Trello e no Notion nada é excluído (ADR 0013).
- **RN-49** No quadro Obras do Grupo - C.SALLES, um comentário pode virar cartão novo no mesmo quadro, uma única vez. O comentário e o cartão de origem não mudam, mesmo em cartões de terceiros (ADR 0017).
- **RN-49a** Taxa de eficiência da equipe = cartões concluídos até a primeira data de entrega ÷ (concluídos com prazo + vencidos em aberto). Adiar a data não melhora a taxa. Cartões sem prazo entram só no tempo médio, da criação à conclusão.
- **RN-49b** Cartão de rotina é marcado pelo proprietário no sistema e fica fora da eficiência no prazo e dos vencidos, mesmo com data.
- **RN-49c** Tarefa da equipe: cada item de checklist vale 1, e o cartão sem checklist vale 1. Cartão concluído resolve todos os seus itens. Desde 13/11/2026, os pontos de tudo o que o cartão resolve, itens e cartão, são divididos igualmente entre os responsáveis do cartão, independentemente de quem marcou no Trello, e a soma das pessoas bate com o total. Tarefa sem responsável fica no fim da lista e fora dos totais e das listas. A tela Equipe não tem posições: ordena por tarefas resolvidas, porque percentual sobre a carga pune quem recebe mais trabalho.

## 5. Riscos e decisões
- **RN-50** (retirada da tela em 13/11/2026, substituída pela RN-49h) Severidade = probabilidade × impacto (1 a 25). **Crítico** quando ≥ 15, **alto** de 8 a 14, **moderado** até 7.
- **RN-51** (retirada da tela em 13/11/2026) Uma decisão com status `tomada` precisa ter o texto da decisão registrado.

## 6. Integrações
- **RN-60** Cada tipo de informação tem **uma fonte oficial** (ADR 0004). As demais ferramentas são espelhos.
- **RN-61** Reimportar o mesmo registro (mesma fonte e mesmo id externo) atualiza, nunca duplica.
- **RN-62** Se o hash não mudou, nada é gravado.
- **RN-63** Se houve alteração nos dois lados desde a última sincronização, gera-se um **conflito** para decisão do usuário. Nada é sobrescrito sozinho.
- **RN-64** A gravação em ferramenta externa exige `modo = leitura_escrita` **e** `escrita_autorizada_em` preenchido pelo proprietário.
- **RN-67** Compromissos da agenda principal são criados, alterados e excluídos pelo sistema, gravando primeiro no Google. Em evento recorrente, a mudança vale só para a data escolhida. A exclusão pede confirmação e, no sistema, o registro fica como cancelado (ADR 0014).
- **RN-68** A linha de base só muda por ação do proprietário. Um arquivo de linha de base alterado entra como reprogramação, e a tela avisa (ADR 0015).
- **RN-65** O MS Project é a fonte oficial do cronograma. O sistema só lê os arquivos `.mpp`.
- **RN-66** Listas do Trello com nomes ligados a credenciais (senha, password, credencial, login, token) e cartões, comentários ou itens de checklist com credencial escrita (por exemplo, `senha:`) **nunca são importados**. Os cartões continuam no Trello; apenas não são copiados para o banco, a auditoria ou os backups.

## 7. Documentos
- **RN-70** O arquivo original não é copiado nem alterado. O sistema guarda índice, referência (Drive/caminho) e texto extraído.
- **RN-71** A categoria vem da pasta de origem (01–15/99 da estrutura-padrão das obras).
- **RN-72** Nomes ligados a credenciais não entram no índice. Texto com credencial não é copiado, e o arquivo entra só pelo nome. Arquivo que some da pasta sai da busca, sem apagar o registro.

## 8. IA (Fase 10)
- **RN-80** A IA responde só com base nas views de leitura, indicando fonte e data de atualização.
- **RN-81** Cada resposta separa **confirmado**, **estimado** e **recomendação**.
- **RN-82** A IA não executa alteração externa sem autorização.
- **RN-84** Token de cliente OAuth não acessa tabelas. Só chama as funções `assistente_*`, e conteúdo com credencial fica de fora (ADR 0021).
- **RN-49d** Ranking de evolução: tarefas resolvidas no período menos as do período anterior de mesmo tamanho, em tarefas e não em porcentagem. Todos aparecem, inclusive quem caiu; empate divide a posição. Quem não resolveu nada no período vai para o fim, sem posição, marcado "sem entregas no período". "Quem resolveu" continua sem posições.
- **RN-49e** Quem gera atividade: cartões criados, checklists adicionados e comentários no quadro da equipe, por autor, no período e contra o período anterior. Sem posições. Item de checklist não entra, porque o Trello não registra quem o criou.
- **RN-49f** Plano de ações da obra (ADR 0022): as ações da aba AÇÕES da Central de Gestão entram como tarefas com origem **Plano de ações**, só leitura. Status, prazo e responsável são alterados na planilha; o agente lê de hora em hora. GUT ≥ 64 marca a tarefa como crítica. Ação que some da planilha não é apagada: fica sinalizada para conferência.
- **RN-49g** Matriz GUT: ações em aberto do plano de ações, ordenadas por G × U × T (64 ou mais é crítico), com o 5W2H. Só leitura: a fonte é a planilha. O lembrete cria um evento de dia inteiro no Google Agenda, sugerido para um dia antes do prazo, com o 5W2H na descrição.
- **RN-49h** Problemas (ADR 0023): cadastrados no sistema, com gravidade, urgência e tendência de 1 a 5 nas frases da planilha GUT 4.0. A fila mostra os abertos do maior GUT para o menor. Cada problema tem ações 5W2H, que são tarefas comuns ligadas a ele; a tela separa Pendentes (sem plano), Resolvendo (com plano) e Concluídos. Com a primeira ação, o problema vai para Resolvendo; com todas as ações concluídas, fica resolvido sozinho; reabrir uma ação o devolve para Resolvendo. Concluir o problema encerra só as ações criadas no sistema; as que vieram do Trello acompanham o cartão e só se encerram quando ele é concluído lá. A planilha da Central de Gestão deixou de ser lida.
- **RN-49i** Lembrete em pomodoro: o sistema lê o Google Agenda na hora e sugere até 3 horários livres, de segunda a sexta, das 08:00 às 16:00, sem o almoço das 12:00 às 13:00, sem sobrepor compromissos. Duração padrão de 30 minutos (30, 40, 60 ou 90). Fim de semana volta para a sexta; dia cheio passa para os próximos dias úteis. Evento de dia inteiro não ocupa horário.
- **RN-49j** Envio de tarefas por WhatsApp: no menu Tarefas, um botão por responsável abre o WhatsApp com a lista das tarefas que estão na tela, já filtradas (título, obra, prazo e atraso), até 40 por mensagem. O sistema não envia nada sozinho: o proprietário confere e envia. Com telefone em Cadastros → Pessoas, abre direto na conversa; sem telefone, o WhatsApp pede o contato.
- **RN-49k** Ação 5W2H vira cartão no Trello: só com o clique do proprietário em **Criar cartão no Trello**. O cartão entra no quadro da equipe (Obras do Grupo - C.SALLES), na lista escolhida (sugestão: a lista da obra), só com o O quê (título), o Quem (membro; sugerido pela pessoa cadastrada ou pelo nome escrito em "outro nome") e o Quando (data de entrega), mais a etiqueta de prioridade (sugestão pela GUT: alta a partir de 64, média a partir de 27). O resto do 5W2H não vai para o cartão. A ação passa a ser o próprio cartão: a situação vem do Trello e o problema muda sozinho de situação. Cada ação vira cartão uma vez; nada é excluído no Trello.
- **RN-49l** **Revogada em 27/11/2026** (decisão do proprietário, Doutrina do Centro de Comando): nada vai para o Trello sem o proprietário pedir. O sistema não cria, não atualiza e não comenta mais cartões no quadro pessoal "tarefas"; o que o proprietário faz pessoalmente fica no sistema e na Agenda. Os cartões espelho já criados ficam no Trello como estão (nada é excluído nem arquivado) e continuam fora da importação; mandar para a equipe (RN-49k) ainda move o cartão antigo, se existir, em vez de duplicar. Texto original: Quadro pessoal "tarefas" do Trello (decisão de 23/11/2026): toda tarefa criada no sistema, inclusive ação 5W2H e captura do Meu dia, ganha um cartão espelho na lista de tarefas abertas, só com título e data. O sistema continua sendo a fonte: título, data e conclusão feitos aqui vão para o cartão; concluir aqui move o cartão para "concluidos". Do Trello volta só a conclusão (ou a reabertura), e vale o lado alterado por último. As abertas antigas e as que falharem ganham o cartão na sincronização. Os cartões espelho não são importados como tarefas; os demais cartões do quadro continuam importados normalmente. Mandar a ação para a equipe (RN-49k) move o mesmo cartão para o quadro da equipe. Nada é excluído nem arquivado no Trello; só grava com a gravação do Trello autorizada.
- **RN-49m** Concluir com saída/decisão: ao concluir uma tarefa criada no sistema, a saída ou decisão (opcional) fica registrada como decisão tomada na obra da tarefa e vai como comentário no cartão. Com a ressalva **Afeta o planejamento da obra**, nasce a tarefa crítica "Atualizar o planejamento: …" com a decisão. O sistema nunca altera o arquivo do cronograma: a alteração e a nova revisão em VALIDOS são do proprietário.
- **RN-49n** Cérebro do planejamento: toda decisão com a ressalva de que afeta o planejamento aparece em **Planejamento → Decisões no planejamento**. O proprietário escolhe a atividade do cronograma vigente e a mudança (atrasa, adianta ou nova duração, em dias úteis); o sistema calcula como o MS Project, pelas ligações (TI, II, TT, IT e defasagem) e respeitando a folga: atividades que andam junto, novo término, variação, e os conflitos (prazo contratual, caminho crítico, marcos, mês de medição, atividades concluídas, datas no passado, falta de ligações), e escreve a rota de alteração do Project. **Aprovar** leva a rota para a tarefa "Atualizar o cronograma" e para o cartão; **Não alterar** conclui essa tarefa. O cálculo é refeito no servidor ao aprovar. Dias úteis de segunda a sexta; o Project recalcula com o calendário da obra. O arquivo do cronograma nunca é alterado pelo sistema.
- **RN-49o** Conferência da nova revisão: o cronograma vigente segue sozinho a revisão mais nova salva na mesma pasta, com o mesmo nome e número de revisão maior (ex.: REV-06 → REV-07; a anterior fica como histórico). Quando a obra ganha revisão nova depois de uma alteração aprovada (RN-49n), a sincronização compara a atividade alterada e o término da obra com o previsto, com tolerância de 3 dias corridos. Conforme: a tarefa "Atualizar o cronograma" é concluída (e o cartão vai para "concluidos"). Divergente: a tarefa continua aberta com o que ficou diferente. O cronograma só é lido, nunca alterado.
- **RN-49p** Placar oficial da equipe (decisão do proprietário em 27/11/2026): a tela Equipe e o PDF KPI da equipe usam períodos do calendário (semana de segunda a domingo e mês do calendário), não mais "últimos 7/30 dias". O período em andamento é **parcial**. Um dia depois de a semana ou o mês terminar, o placar é gravado (tabela equipe_placares) e não muda mais, mesmo que o Trello seja alterado depois; é ele que vale para a disputa e para o relatório enviado à equipe. A evolução compara com o placar oficial do período anterior, quando existe. Item de checklist desmarcado e marcado de novo conta na data da primeira marcação. O placar oficial começa em novembro/2026 (mês) e na semana de 23/11/2026.
- **RN-49q** Botões de comando na tarefa (Doutrina do Centro de Comando, 27/11/2026): toda tarefa criada no sistema e ainda aberta tem os mesmos 4 botões da Mesa. **Fazer eu**: reserva um horário livre na Agenda do proprietário (mesma busca do lembrete, RN-49i) e a tarefa passa para ele; a equipe não vê. **Delegar para a equipe**: a própria tarefa vira cartão no quadro da equipe escolhido (título, descrição, pessoa, prazo e prioridade digitados ou ajustados por ele) e passa a acompanhar o cartão (RN-49k); só com o clique. **Adiar**: o prazo passa para a data escolhida, sempre depois de hoje. **Não se aplica mais**: a tarefa é encerrada como cancelada, com o motivo e a data no fim da descrição. Concluir com saída/decisão continua como antes. Vale também para as ações 5W2H dos Problemas (cada ação é uma tarefa): na tela do problema, o link "Fazer eu · Delegar · Adiar · Não se aplica" abre a ação, e a situação do problema se atualiza quando ela é adiada, delegada ou deixa de se aplicar (RN-49h).
- **RN-49r** Ficha de prontidão da obra (Doutrina do Centro de Comando, 27/11/2026): a tela da obra confere sozinha, com os dados do sistema, o que precisa existir e estar atualizado. Contrato cadastrado; aditivo em análise (desatualizado após 30 dias); cronograma vigente e linha de base cadastrados e lidos sem erro; cronograma alterado nos últimos 7 dias (obra em andamento); término do cronograma vigente dentro do término do contrato com aditivos aprovados; atividades vencidas sem concluir (falta se do caminho crítico); medição do mês anterior cadastrada (até o dia 5, vale o mês retrasado); medições sem data de envio; diário de obra nos últimos 4 dias, equipe/efetivo e ART pelo índice das pastas (não encontrado = Conferir, não falta certa); documentos em 99 REVISAR; problemas com GUT ≥ 64 em aberto. Situações: Falta, Desatualizado, Conferir, Em ordem; o que está em ordem fica recolhido. Piloto: PRF-RECANTO, cujas faltas e desatualizados também entram na caixa Alertas da Mesa, menos o que os Alertas já mostram (prazo do contrato e problemas críticos).
- **RN-49s** Sala de Situação (Doutrina do Centro de Comando, 27/11/2026): no topo da tela Obras, uma linha por obra e uma coluna por área (Contrato, Prazo, Medição, Documentação, Problemas). A cor é a pior situação da área pela ficha de prontidão (RN-49r): Falta (vermelho), Desatualizado (cinza), Atenção (amarelo), Em dia (verde); sem item, traço. Ao lado vai a data da informação mais recente da área (aditivo, alteração do cronograma vigente, fim da última medição, último diário). Obras com falta sobem para o topo. Contrato sem data de término vira Atenção, porque o prazo não pode ser conferido.
- **RN-49t** Controle de ordens (Doutrina do Centro de Comando, 27/11/2026): ordem é a tarefa que nasceu de uma decisão do proprietário, delegada à equipe (Delegar na Mesa, na tarefa ou na ação de problema) ou assumida por ele (Fazer eu). A tela Controle de ordens mostra cada uma com quem está, prazo e situação: vencida, sem movimento, concluída a conferir, em dia, conferida. Ordem concluída espera o botão Conferido (o proprietário viu o resultado). A caixa Cobrar da Mesa passa a cobrar só ordens delegadas, pelos gatilhos (RN-49u); os demais cartões da equipe ficam no Trello e no painel Equipe. Ordem concluída e não conferida aparece em Aprovar.
- **RN-49u** Gatilhos (Doutrina do Centro de Comando, 27/11/2026): o proprietário escolhe o que toca o alarme e o limite de cada um, na tela Gatilhos. Vêm ligados com os valores da Doutrina: ordem vencida há 3 dias; ordem parada há 7 dias; medição do mês anterior até o dia 5; cronograma além do contrato (0 dia de tolerância); caminho crítico vencido (0 dia); cronograma sem alteração há mais de 7 dias; aditivo em análise há mais de 30 dias; diário sem registro há mais de 4 dias; problema com GUT a partir de 64. Desligado, o item continua visível na ficha como Atenção, mas não fica vermelho nem vai para a Mesa. Mudanças ficam na auditoria.
- **RN-49v** Menu de 5 itens (Doutrina do Centro de Comando, 27/11/2026): Mesa, Obras, Agenda, Equipe e Configurações. As demais telas continuam existindo e aparecem como subitens só do item aberto: Mesa (Controle de ordens, Meu dia, Tarefas, Problemas), Obras (Painel executivo, Alertas, Planejamento, Contratos, Documentos, Relatórios), Configurações (Gatilhos, Integrações, Cadastros). A ficha da obra tem abas que abrem planejamento, contrato, tarefas, problemas, documentos e relatório já filtrados nela. Toda função nova responde antes em qual dos 5 itens mora.
- **RN-49w** Menos Trello no sistema (Doutrina, 27/11/2026): nos quadros da equipe, só é do proprietário o cartão em que ele é membro; cartão sem membro vai para a equipe e sai do Meu dia. A tela Tarefas mostra do quadro da equipe só os cartões dele e as ordens dele (RN-49t); os demais ficam no Trello e no painel Equipe, com o link "Mostrar também" para vê-los. Filtrar por quadro ou responsável mostra tudo. Quadros pessoais dele continuam como antes (decisão de 27/11/2026). O placar da equipe não muda.
- **RN-83** Alertas automáticos usam regras fixas, sem IA: contrato que vence em até 60 dias, venceu com saldo a medir ou termina antes do cronograma; última medição há mais de 35 dias com saldo a medir; marco, recebimento ou decisão em até 7 dias ou vencidos; tarefas vencidas; riscos críticos; cartões parados; integrações com problema.


## 9. Mesa do Gestor (26/11/2026)
- RN-90 Decidir: `decisoes` com status `pendente`, tipo `decisao` e `adiar_ate` nulo ou já alcançado.
- RN-91 Aprovar: `decisoes` tipo `aprovacao` pendentes + medições `elaborada`/`enviada` + aditivos `em_analise`.
- RN-92 Cobrar: tarefas abertas com responsável que não é o usuário, vencidas ou sem movimento há 7 dias.
- RN-93 Alertas: vencimentos de marco/recebimento em até 15 dias, riscos críticos e alertas RN-83 sem repetir as outras caixas; marcos vencidos somados numa linha.
- RN-94 Empresa do item = empresa da obra (ou a da decisão). Filtrar uma empresa inclui as que pertencem a ela; "Grupo inteiro" mostra tudo.
- RN-95 Delegar cria tarefa (tipo `acao`) espelhada no Trello e adia a decisão até o prazo (ou 7 dias).
- RN-96 Pastas 16–97 das obras = categoria `pasta_da_obra`, exibida com o nome da pasta.
