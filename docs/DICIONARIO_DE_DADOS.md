# Dicionário de Dados

> Gerado automaticamente por `packages/db/scripts/gerar-dicionario.js` a partir das migrations. Não edite à mão.

## Tabela `aditivos`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| contrato_id | uuid | sim | contratos |  |
| numero | text | sim |  |  |
| tipo | text | sim |  |  |
| valor_delta | numeric(14,2) | sim |  | Variação de valor com sinal: supressão é negativa. |
| dias_delta | integer | sim |  |  |
| data_assinatura | date |  |  |  |
| justificativa | text |  |  |  |
| situacao | text | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `anexos`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| entidade | text | sim |  |  |
| registro_id | uuid | sim |  |  |
| documento_id | uuid | sim | documentos |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `atividades_cronograma`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| versao_id | uuid | sim | cronograma_versoes |  |
| uid_project | integer | sim |  |  |
| edt | text |  |  |  |
| nome | text | sim |  |  |
| nivel | smallint | sim |  |  |
| resumo | boolean | sim |  |  |
| marco | boolean | sim |  |  |
| critica | boolean | sim |  |  |
| duracao_dias | numeric(8,2) |  |  |  |
| inicio_previsto | date |  |  |  |
| fim_previsto | date |  |  |  |
| inicio_real | date |  |  |  |
| fim_real | date |  |  |  |
| percentual | numeric(5,2) | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |
| custo | numeric(14,2) |  |  |  |

## Tabela `avanco_fisico`

Série temporal da Curva S (percentuais acumulados).

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| obra_id | uuid | sim | obras |  |
| data_referencia | date | sim |  |  |
| previsto_acum | numeric(5,2) |  |  |  |
| realizado_acum | numeric(5,2) |  |  |  |
| fonte | text | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `conectores`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| ferramenta | text | sim |  |  |
| nome_exibicao | text | sim |  |  |
| ativo | boolean | sim |  |  |
| pausado_ate | timestamp with time zone |  |  |  |
| modo | text | sim |  |  |
| escrita_autorizada_em | timestamp with time zone |  |  | Gravação externa só é possível após autorização explícita do proprietário. |
| estado_conexao | text | sim |  |  |
| configuracao | jsonb | sim |  |  |
| credencial_ref | text |  |  | Nome do segredo no Supabase Vault. O token em si nunca fica nesta tabela. |
| intervalo_minutos | integer | sim |  |  |
| ultima_sync_em | timestamp with time zone |  |  |  |
| proxima_sync_em | timestamp with time zone |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `contratantes`

Clientes/órgãos que contratam as obras.

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| nome | text | sim |  |  |
| tipo | text | sim |  |  |
| orgao | text |  |  |  |
| cnpj | text |  |  |  |
| observacoes | text |  |  |  |
| arquivado_em | timestamp with time zone |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `contrato_itens`

Serviços do contrato, vindos da planilha de medição. Item que some da planilha não é apagado.

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| contrato_id | uuid | sim | contratos |  |
| item | text | sim |  |  |
| descricao | text | sim |  |  |
| unidade | text |  |  |  |
| quantidade | numeric(14,4) | sim |  |  |
| preco_unitario | numeric(18,6) | sim |  |  |
| valor_total | numeric(14,2) | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `contratos`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| obra_id | uuid | sim | obras |  |
| contratante_id | uuid |  | contratantes |  |
| numero | text | sim |  |  |
| objeto | text |  |  |  |
| modalidade | text |  |  |  |
| regime | text |  |  |  |
| data_assinatura | date |  |  |  |
| data_inicio | date |  |  |  |
| prazo_original_dias | integer |  |  |  |
| data_termino_original | date |  |  |  |
| valor_original | numeric(14,2) | sim |  |  |
| indice_reajuste | text |  |  |  |
| data_base | date |  |  |  |
| arquivado_em | timestamp with time zone |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `cronograma_arquivos`

Arquivos do MS Project acompanhados pelo agente local.

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| obra_id | uuid | sim | obras |  |
| papel | text | sim |  |  |
| caminho | text | sim |  |  |
| ultimo_hash | text |  |  |  |
| ultima_leitura_em | timestamp with time zone |  |  |  |
| ultimo_erro | text |  |  |  |
| valor_executado_anterior | numeric(14,2) |  |  | Valor já executado antes do início deste cronograma. É o ponto de partida da Curva S vigente. |
| data_executado_anterior | date |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `cronograma_versoes`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| obra_id | uuid | sim | obras |  |
| nome | text | sim |  |  |
| tipo | text | sim |  |  |
| data_status | date |  |  |  |
| arquivo_origem | text |  |  |  |
| fonte | text | sim |  |  |
| id_externo | text |  |  |  |
| importado_em | timestamp with time zone |  |  |  |
| atualizado_em_origem | timestamp with time zone |  |  |  |
| hash_conteudo | text |  |  |  |
| status_sync | text | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |
| arquivo_id | uuid |  | cronograma_arquivos |  |

## Tabela `decisoes`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| obra_id | uuid |  | obras |  |
| reuniao_id | uuid |  | reunioes |  |
| risco_id | uuid |  | riscos |  |
| problema | text | sim |  |  |
| decisao | text |  |  |  |
| responsavel_id | uuid |  | pessoas |  |
| prazo | date |  |  |  |
| status | text | sim |  |  |
| data_decisao | date |  |  |  |
| resultado | text |  |  |  |
| fonte | text | sim |  |  |
| id_externo | text |  |  |  |
| importado_em | timestamp with time zone |  |  |  |
| atualizado_em_origem | timestamp with time zone |  |  |  |
| hash_conteudo | text |  |  |  |
| status_sync | text | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `dependencias`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| atividade_id | uuid | sim | atividades_cronograma |  |
| predecessora_id | uuid | sim | atividades_cronograma |  |
| tipo | text | sim |  | TI=término-início, II=início-início, TT=término-término, IT=início-término. |
| defasagem_dias | numeric(8,2) | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `documento_versoes`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| documento_id | uuid | sim | documentos |  |
| versao | integer | sim |  |  |
| drive_revision_id | text |  |  |  |
| hash_conteudo | text |  |  |  |
| modificado_em | timestamp with time zone |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `documentos`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| obra_id | uuid |  | obras |  |
| categoria | text | sim |  | Taxonomia derivada da estrutura de pastas 01–15/99 das obras. |
| titulo | text | sim |  |  |
| assunto | text |  |  |  |
| data_documento | date |  |  |  |
| caminho_local | text |  |  |  |
| drive_file_id | text |  |  |  |
| url | text |  |  |  |
| mime_type | text |  |  |  |
| tamanho_bytes | bigint |  |  |  |
| texto_extraido | text |  |  |  |
| busca | tsvector |  |  |  |
| fonte | text | sim |  |  |
| id_externo | text |  |  |  |
| importado_em | timestamp with time zone |  |  |  |
| atualizado_em_origem | timestamp with time zone |  |  |  |
| hash_conteudo | text |  |  |  |
| status_sync | text | sim |  |  |
| arquivado_em | timestamp with time zone |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `empresas`

Empresas pelas quais o gestor atua (executoras). Ex.: construtora contratada.

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| razao_social | text | sim |  |  |
| nome_fantasia | text |  |  |  |
| cnpj | text |  |  | Somente dígitos (14). |
| observacoes | text |  |  |  |
| arquivado_em | timestamp with time zone |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `eventos`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| titulo | text | sim |  |  |
| descricao | text |  |  |  |
| inicio | timestamp with time zone | sim |  |  |
| fim | timestamp with time zone |  |  |  |
| dia_inteiro | boolean | sim |  |  |
| local | text |  |  |  |
| obra_id | uuid |  | obras |  |
| tarefa_id | uuid |  | tarefas |  |
| calendario_externo_id | text |  |  |  |
| ical_uid | text |  |  |  |
| fonte | text | sim |  |  |
| id_externo | text |  |  |  |
| importado_em | timestamp with time zone |  |  |  |
| atualizado_em_origem | timestamp with time zone |  |  |  |
| hash_conteudo | text |  |  |  |
| status_sync | text | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |
| cancelado_em | timestamp with time zone |  |  | Preenchido quando o evento foi cancelado ou removido na ferramenta de origem. |

## Tabela `fornecedores`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| razao_social | text | sim |  |  |
| nome_fantasia | text |  |  |  |
| cnpj | text |  |  |  |
| especialidade | text |  |  |  |
| contato | text |  |  |  |
| avaliacao | smallint |  |  |  |
| observacoes | text |  |  |  |
| arquivado_em | timestamp with time zone |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `importacao_obras`

Propostas de obras lidas das pastas locais. Só viram obras após aprovação do proprietário.

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| fonte | text | sim |  |  |
| id_externo | text | sim |  |  |
| pasta_local | text | sim |  |  |
| nome_sugerido | text | sim |  |  |
| codigo_sugerido | text | sim |  |  |
| situacao_sugerida | text | sim |  |  |
| pista_contratante | text |  |  |  |
| observacao | text |  |  |  |
| provavel_nao_obra | boolean | sim |  |  |
| qtd_arquivos | integer | sim |  |  |
| qtd_cronogramas | integer | sim |  |  |
| qtd_planilhas | integer | sim |  |  |
| qtd_pdfs | integer | sim |  |  |
| tamanho_bytes | bigint | sim |  |  |
| ultima_modificacao | timestamp with time zone |  |  |  |
| estrutura_padrao | boolean | sim |  |  |
| subpastas | text[] | sim |  |  |
| status | text | sim |  |  |
| obra_id | uuid |  | obras |  |
| revisado_em | timestamp with time zone |  |  |  |
| importado_em | timestamp with time zone | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `indicadores_snapshot`

Fotografia periódica dos indicadores, para histórico e tendência.

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| obra_id | uuid | sim | obras |  |
| data_referencia | date | sim |  |  |
| pct_fisico_previsto | numeric(5,2) |  |  |  |
| pct_fisico_realizado | numeric(5,2) |  |  |  |
| valor_contratado | numeric(14,2) |  |  |  |
| valor_medido | numeric(14,2) |  |  |  |
| valor_recebido | numeric(14,2) |  |  |  |
| dias_alem_do_prazo | integer |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `lancamentos_financeiros`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| contrato_id | uuid | sim | contratos |  |
| medicao_id | uuid |  | medicoes |  |
| tipo | text | sim |  |  |
| valor | numeric(14,2) | sim |  |  |
| data_prevista | date |  |  |  |
| data_efetiva | date |  |  |  |
| nota_fiscal | text |  |  |  |
| observacoes | text |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `marcos`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| obra_id | uuid | sim | obras |  |
| nome | text | sim |  |  |
| contratual | boolean | sim |  |  |
| data_contratual | date |  |  |  |
| data_prevista | date |  |  |  |
| data_real | date |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `medicao_arquivos`

Planilha de medições acompanhada pelo agente local, uma por contrato.

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| contrato_id | uuid | sim | contratos |  |
| modelo | text | sim |  |  |
| caminho | text | sim |  |  |
| ultimo_hash | text |  |  |  |
| ultima_leitura_em | timestamp with time zone |  |  |  |
| ultimo_erro | text |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `medicao_itens`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| medicao_id | uuid | sim | medicoes |  |
| item_id | uuid | sim | contrato_itens |  |
| quantidade | numeric(14,4) | sim |  |  |
| valor | numeric(14,2) | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `medicoes`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| contrato_id | uuid | sim | contratos |  |
| numero | integer | sim |  |  |
| periodo_inicio | date | sim |  |  |
| periodo_fim | date | sim |  |  |
| valor_medido | numeric(14,2) | sim |  |  |
| valor_glosado | numeric(14,2) | sim |  |  |
| percentual_fisico_acum | numeric(5,2) |  |  |  |
| situacao | text | sim |  |  |
| data_envio | date |  |  |  |
| data_aprovacao | date |  |  |  |
| fonte | text | sim |  |  |
| id_externo | text |  |  |  |
| importado_em | timestamp with time zone |  |  |  |
| atualizado_em_origem | timestamp with time zone |  |  |  |
| hash_conteudo | text |  |  |  |
| status_sync | text | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |
| data_medicao | date |  |  |  |
| diferenca_planilha | numeric(14,2) |  |  | Valor da planilha menos o valor gravado, quando a planilha mudou depois do envio da medição. |

## Tabela `obra_participantes`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| obra_id | uuid | sim | obras |  |
| pessoa_id | uuid |  | pessoas |  |
| fornecedor_id | uuid |  | fornecedores |  |
| papel | text | sim |  |  |
| inicio | date |  |  |  |
| fim | date |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `obras`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| codigo | text | sim |  |  |
| nome | text | sim |  |  |
| empresa_id | uuid |  | empresas |  |
| contratante_id | uuid |  | contratantes |  |
| endereco | text |  |  |  |
| cidade | text |  |  |  |
| uf | character(2) |  |  |  |
| situacao | text | sim |  |  |
| data_inicio | date |  |  |  |
| data_termino_prevista | date |  |  | Previsão gerencial de término (pode diferir do prazo contratual vigente). |
| pasta_local | text |  |  | Caminho da pasta da obra no PC (referência, não cópia). |
| drive_folder_id | text |  |  |  |
| observacoes | text |  |  |  |
| arquivado_em | timestamp with time zone |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `operacoes_externas`

Toda gravação feita numa ferramenta externa: o quê, onde, quando e com qual resultado.

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| ferramenta | text | sim |  |  |
| operacao | text | sim |  |  |
| entidade | text | sim |  |  |
| registro_id | uuid | sim |  |  |
| id_externo | text | sim |  |  |
| status | text | sim |  |  |
| detalhe | text |  |  |  |
| erro | text |  |  |  |
| executado_em | timestamp with time zone |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `pessoas`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| nome | text | sim |  |  |
| funcao | text |  |  |  |
| empresa_id | uuid |  | empresas |  |
| email | text |  |  |  |
| telefone | text |  |  |  |
| eh_usuario | boolean | sim |  |  |
| observacoes | text |  |  |  |
| arquivado_em | timestamp with time zone |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `reunioes`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| evento_id | uuid |  | eventos |  |
| obra_id | uuid |  | obras |  |
| titulo | text | sim |  |  |
| data | date | sim |  |  |
| pauta | text |  |  |  |
| participantes | text[] |  |  |  |
| ata | text |  |  |  |
| fonte | text | sim |  |  |
| id_externo | text |  |  |  |
| importado_em | timestamp with time zone |  |  |  |
| atualizado_em_origem | timestamp with time zone |  |  |  |
| hash_conteudo | text |  |  |  |
| status_sync | text | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `riscos`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| obra_id | uuid |  | obras |  |
| descricao | text | sim |  |  |
| origem | text |  |  |  |
| categoria | text |  |  |  |
| probabilidade | smallint | sim |  |  |
| impacto | smallint | sim |  |  |
| severidade | smallint |  |  |  |
| responsavel_id | uuid |  | pessoas |  |
| prazo | date |  |  |  |
| plano_resposta | text |  |  |  |
| status | text | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `sync_conflitos`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| conector_id | uuid | sim | conectores |  |
| entidade | text | sim |  |  |
| registro_id | uuid | sim |  |  |
| id_externo | text |  |  |  |
| valor_local | jsonb | sim |  |  |
| valor_externo | jsonb | sim |  |  |
| detectado_em | timestamp with time zone | sim |  |  |
| resolucao | text |  |  |  |
| resolvido_em | timestamp with time zone |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `sync_execucoes`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| conector_id | uuid | sim | conectores |  |
| gatilho | text | sim |  |  |
| iniciado_em | timestamp with time zone | sim |  |  |
| finalizado_em | timestamp with time zone |  |  |  |
| status | text | sim |  |  |
| lidos | integer | sim |  |  |
| criados | integer | sim |  |  |
| atualizados | integer | sim |  |  |
| ignorados | integer | sim |  |  |
| conflitos | integer | sim |  |  |
| erros | integer | sim |  |  |
| mensagem | text |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `sync_itens`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | bigint | sim |  |  |
| execucao_id | uuid | sim | sync_execucoes |  |
| entidade | text | sim |  |  |
| id_externo | text | sim |  |  |
| registro_id | uuid |  |  |  |
| acao | text | sim |  |  |
| hash_conteudo | text |  |  |  |
| erro | text |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |

## Tabela `tarefa_dependencias`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| tarefa_id | uuid | sim | tarefas |  |
| depende_de_id | uuid | sim | tarefas |  |
| criado_em | timestamp with time zone | sim |  |  |

## Tabela `tarefa_membros`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| tarefa_id | uuid | sim | tarefas |  |
| membro_id | uuid | sim | trello_membros |  |
| criado_em | timestamp with time zone | sim |  |  |

## Tabela `tarefas`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| codigo | bigint | sim |  |  |
| titulo | text | sim |  |  |
| descricao | text |  |  |  |
| obra_id | uuid |  | obras |  |
| responsavel_id | uuid |  | pessoas |  |
| aguardando_pessoa_id | uuid |  | pessoas |  |
| tarefa_pai_id | uuid |  | tarefas |  |
| tipo | text | sim |  |  |
| categoria | text |  |  |  |
| prazo | date |  |  | Prazo definido pelo usuário ou pela origem. O sistema nunca altera prazos automaticamente. |
| importancia | smallint | sim |  |  |
| impacto | smallint | sim |  |  |
| critica | boolean | sim |  |  |
| status | text | sim |  |  |
| concluida_em | timestamp with time zone |  |  |  |
| fonte | text | sim |  |  |
| id_externo | text |  |  |  |
| importado_em | timestamp with time zone |  |  |  |
| atualizado_em_origem | timestamp with time zone |  |  |  |
| hash_conteudo | text |  |  |  |
| status_sync | text | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `trello_cartao_datas`

Criação, conclusão real e prazo original do cartão, lidos do histórico do Trello.

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| tarefa_id | uuid | sim | tarefas |  |
| criado_em | timestamp with time zone | sim |  |  |
| concluido_em | timestamp with time zone |  |  |  |
| prazo_original | date |  |  | Primeira data de entrega do cartão. É a referência da taxa de eficiência, para adiar o prazo não melhorar a taxa. |
| prazo_alteracoes | integer | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `trello_checklist_itens`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| tarefa_id | uuid | sim | tarefas |  |
| id_externo | text | sim |  |  |
| checklist | text | sim |  |  |
| nome | text | sim |  |  |
| concluido | boolean | sim |  |  |
| posicao | numeric | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `trello_comentarios`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| tarefa_id | uuid | sim | tarefas |  |
| id_externo | text | sim |  |  |
| autor | text |  |  |  |
| texto | text | sim |  |  |
| data | timestamp with time zone | sim |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## Tabela `trello_membros`

Membros do Trello. Ficam fora de pessoas para não misturar com o cadastro da empresa.

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid | sim |  |  |
| id_externo | text | sim |  |  |
| nome | text | sim |  |  |
| usuario | text |  |  |  |
| criado_em | timestamp with time zone | sim |  |  |
| atualizado_em | timestamp with time zone | sim |  |  |

## View `cronograma_realizado`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| versao_id | uuid |  |  |  |
| obra_id | uuid |  |  |  |
| arquivo_id | uuid |  |  |  |
| data_leitura | date |  |  |  |
| total | numeric |  |  |  |
| realizado | numeric |  |  |  |

## View `v_contrato_itens_saldo`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| item_id | uuid |  |  |  |
| contrato_id | uuid |  |  |  |
| item | text |  |  |  |
| descricao | text |  |  |  |
| unidade | text |  |  |  |
| quantidade | numeric(14,4) |  |  |  |
| preco_unitario | numeric(18,6) |  |  |  |
| valor_total | numeric(14,2) |  |  |  |
| quantidade_medida | numeric |  |  |  |
| valor_medido | numeric |  |  |  |
| quantidade_saldo | numeric |  |  |  |
| valor_saldo | numeric |  |  |  |
| acima_do_contrato | boolean |  |  |  |

## View `v_contratos_resumo`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| contrato_id | uuid |  |  |  |
| obra_id | uuid |  |  |  |
| numero | text |  |  |  |
| valor_original | numeric(14,2) |  |  |  |
| valor_aditivos | numeric |  |  |  |
| valor_contratado | numeric |  |  |  |
| data_termino_original | date |  |  |  |
| data_termino_vigente | date |  |  |  |
| valor_medido | numeric |  |  |  |
| valor_faturado | numeric |  |  |  |
| valor_recebido | numeric |  |  |  |
| saldo_a_medir | numeric |  |  |  |
| saldo_a_receber | numeric |  |  |  |

## View `v_obra_resumo`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| obra_id | uuid |  |  |  |
| codigo | text |  |  |  |
| nome | text |  |  |  |
| situacao | text |  |  |  |
| empresa_id | uuid |  |  |  |
| contratante_id | uuid |  |  |  |
| data_inicio | date |  |  |  |
| data_termino_prevista | date |  |  |  |
| data_termino_contratual_vigente | date |  |  |  |
| valor_contratado | numeric |  |  |  |
| valor_medido | numeric |  |  |  |
| valor_faturado | numeric |  |  |  |
| valor_recebido | numeric |  |  |  |
| saldo_a_medir | numeric |  |  |  |
| pct_financeiro | numeric |  |  |  |
| pct_fisico_previsto | numeric(5,2) |  |  |  |
| pct_fisico_realizado | numeric(5,2) |  |  |  |
| data_avanco | date |  |  |  |
| desvio_fisico | numeric |  |  |  |
| dias_alem_do_prazo | integer |  |  |  |

## View `v_riscos_criticos`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid |  |  |  |
| obra_id | uuid |  |  |  |
| descricao | text |  |  |  |
| origem | text |  |  |  |
| categoria | text |  |  |  |
| probabilidade | smallint |  |  |  |
| impacto | smallint |  |  |  |
| severidade | smallint |  |  |  |
| responsavel_id | uuid |  |  |  |
| prazo | date |  |  |  |
| plano_resposta | text |  |  |  |
| status | text |  |  |  |
| criado_em | timestamp with time zone |  |  |  |
| atualizado_em | timestamp with time zone |  |  |  |

## View `v_tarefas_priorizadas`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| id | uuid |  |  |  |
| codigo | bigint |  |  |  |
| titulo | text |  |  |  |
| descricao | text |  |  |  |
| obra_id | uuid |  |  |  |
| responsavel_id | uuid |  |  |  |
| aguardando_pessoa_id | uuid |  |  |  |
| tarefa_pai_id | uuid |  |  |  |
| tipo | text |  |  |  |
| categoria | text |  |  |  |
| prazo | date |  |  |  |
| importancia | smallint |  |  |  |
| impacto | smallint |  |  |  |
| critica | boolean |  |  |  |
| status | text |  |  |  |
| concluida_em | timestamp with time zone |  |  |  |
| fonte | text |  |  |  |
| id_externo | text |  |  |  |
| importado_em | timestamp with time zone |  |  |  |
| atualizado_em_origem | timestamp with time zone |  |  |  |
| hash_conteudo | text |  |  |  |
| status_sync | text |  |  |  |
| criado_em | timestamp with time zone |  |  |  |
| atualizado_em | timestamp with time zone |  |  |  |
| dias_para_prazo | integer |  |  |  |
| urgencia | integer |  |  |  |
| vencida | boolean |  |  |  |
| vence_hoje | boolean |  |  |  |
| escore | smallint |  |  |  |
| minha | boolean |  |  |  |

## View `v_vencimentos`

| Coluna | Tipo | Obrigatória | Referência | Descrição |
|---|---|---|---|---|
| tipo | text |  |  |  |
| registro_id | uuid |  |  |  |
| obra_id | uuid |  |  |  |
| descricao | text |  |  |  |
| data | date |  |  |  |
