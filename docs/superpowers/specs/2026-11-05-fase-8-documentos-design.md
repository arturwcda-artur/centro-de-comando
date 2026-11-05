# Fase 8, parte 1 — Documentos: especificação
**Data:** 2026-11-05 · **Piloto:** PRF-Recanto · **Desenho aprovado pelo proprietário em:** 2026-11-05

## Objetivo
Encontrar qualquer documento da obra por nome ou conteúdo e abri-lo pelo Google Drive, inclusive no celular, sem copiar nem alterar nenhum arquivo (RN-70).

## Decisões já tomadas
| Assunto | Decisão |
|---|---|
| Abertura | Pelo link do Google Drive. Sem link, a tela mostra o caminho com botão de copiar |
| Permissão no Google | Só os dados dos arquivos, nunca o conteúdo |
| Texto | PDF, Word e Excel, até 50 mil caracteres por arquivo |
| PDFs digitalizados | Sem OCR nesta fase. Entram pelo nome e aparecem marcados |
| Obras | Só a PRF-Recanto. As demais entram depois, por cadastro |
| Relatórios | Segunda parte da Fase 8, com desenho próprio |

## Fora do escopo
- Leitura de PDFs digitalizados.
- Vincular documento a uma medição ou tarefa específica.
- Abrir, editar ou mover arquivos pelo sistema.
- Relatórios em Excel e PDF.

## Componentes

### 1. Banco (migration 0023)
**`documento_pastas`:** `obra_id` (única), `caminho`, `ultima_leitura_em`, `ultimo_erro`. A PRF-Recanto é cadastrada a partir de `obras.pasta_local`.

**Alterações em `documentos`:**
- `pasta text`: caminho relativo da pasta.
- `obsoleto boolean`: arquivo em pasta `obsoleto`.
- `sem_texto boolean`: PDF digitalizado.

**Funções para o papel `agente_cronograma`, sem senha nova:**
- `listar_pastas_agente()`.
- `listar_documentos_agente(p_pasta uuid)`: caminho relativo e assinatura de cada documento conhecido.
- `importar_documentos(payload jsonb)`: grava um lote em uma transação.
- `encerrar_leitura_documentos(p_pasta uuid, p_presentes text[])`: arquiva o que sumiu da pasta e registra a leitura.
- `registrar_erro_pasta(p_pasta uuid, p_erro text)`.

**Função `tamanho_do_banco()`:** para a tela Integrações mostrar o espaço usado, exigindo o proprietário.

**Identificação:** `fonte = 'pasta'` e `id_externo` = id da obra + caminho relativo. Reimportar não duplica (RN-61).

### 2. Agente (`agente-local/cc_agente/documentos.py`)
Percorre a pasta sem alterar nada.
- **Assinatura:** tamanho e data de modificação, em `hash_conteudo`. Assim, o agente não precisa ler 6 GB a cada execução. Só relê o arquivo cuja assinatura mudou.
- **Categoria:** vem do prefixo da pasta de primeiro nível (RN-71): `01` planejamento, `02` orçamento, `03` contratos, `04` aditivos, `05` medições, `06` financeiro, `07` compras, `08` projetos, `09` programações, `10` atas, `11` ofícios, `12` jurídicos, `13` equipe, `14` diário, `15` terceirizados, `99` revisar. O resto é `outro`.
- **Texto:** `pypdf` para PDF, leitura do XML interno para `.docx`, `openpyxl` para `.xlsx`. Fica limitado a 50 mil caracteres.
- **Fica fora:** `.py`, `.pyc`, `.bat`, `.cmd`, `.tmp`, `.lnk`, `.ini`, arquivos que começam com `~$`, as pastas `motor`, `__pycache__`, `.git` e `node_modules`, e nomes ligados a credenciais (`senha`, `password`, `credencial`, `token`).
- **Texto com credencial:** se o texto extraído tiver o padrão de RN-66, o documento entra só pelo nome.
- **Arquivo sumido:** recebe `arquivado_em`. Nada é apagado.
- **Falha de um arquivo:** ele entra só pelo nome, e os outros seguem.
- **Envio:** lotes de 50 documentos.

Entra no atalho **Atualizar cronogramas** e na rotina semanal.

### 3. Link do Drive (`packages/integrations/src/google-drive.js`)
- **Permissão:** escopo adicional `drive.metadata.readonly`. O proprietário usa **Reconectar Google** uma vez.
- **Quando:** na sincronização de hora em hora, depois da agenda.
- **Como:** procura no Drive a pasta com o nome da pasta da obra, percorre as subpastas e monta o mapa de caminho relativo para id e link.
- **Pastas com o mesmo nome:** usa a que tiver mais caminhos iguais aos do índice.
- **Gravação:** só grava em `documento_links`, e só o que mudou. A tabela fica fora de `documentos` para não copiar o texto para a auditoria a cada link.
- **Sem a permissão:** a etapa é ignorada com aviso, e a agenda continua funcionando.

O conector continua sem nenhuma gravação no Drive.

### 4. Tela Documentos (`/documentos`)
- Busca por nome e conteúdo, usando a coluna `busca`, com filtro por obra e categoria.
- Cada resultado mostra título, pasta, data, tipo e o trecho onde o termo aparece.
- Sem busca, a tela lista os mais recentes por categoria.
- Um clique abre no Drive. Sem link, aparece o botão **Copiar caminho**.
- Etiquetas: **Obsoleto** e **Digitalizado**.
- Por padrão, os obsoletos ficam fora, com opção de incluir.

**Avisos na tela:**
- Documentos sem link do Drive, com a quantidade.
- Documentos digitalizados, com a quantidade.
- Última leitura com mais de 7 dias.
- Erro de leitura da pasta.

### 5. Ligação com outras telas
- A busca global passa a abrir o documento.
- **Contratos** e **Planejamento** ganham um link para os documentos daquela categoria da obra.
- **Integrações** mostra o espaço usado do banco.

## Segurança
- O agente só lê as pastas.
- O sincronizador só lê dados dos arquivos no Drive.
- O texto dos documentos fica sujeito à auditoria, por isso ocupa cerca do dobro do espaço.
- Documentos ligados a credenciais não entram.

## Testes
- **Agente (pytest):** categoria, exclusões, obsoleto, assinatura igual, texto de PDF, Word e Excel, limite de texto, PDF sem texto, texto com credencial, arquivo com erro e arquivo sumido.
- **Banco (PGlite):** importação idempotente, arquivo sumido, limites do papel e busca por conteúdo.
- **Integrações (vitest):** mapa de caminhos, escolha da pasta certa, paginação e atualização só do que mudou.
- **Web (vitest):** validação dos filtros e montagem dos avisos.
- **Teste real:** a PRF-Recanto deve indexar perto de 300 arquivos, com 170 PDFs com texto e 15 digitalizados, e a busca deve achar um termo de dentro de um PDF.

## Critérios de pronto
1. A primeira leitura indexa a pasta, e a segunda não relê nenhum arquivo.
2. Nenhum arquivo muda de data ou conteúdo.
3. Um termo de dentro de um PDF é encontrado, e o clique abre o arquivo no Drive.
4. Arquivo apagado da pasta sai da busca, sem apagar o registro.
5. A tela Integrações mostra o espaço usado.
6. ADR 0018, documentação, dicionário e CHANGELOG atualizados.

## Passos do proprietário
1. Usar **Reconectar Google** e aceitar a permissão nova.
2. Rodar o atalho.
3. Conferir a busca no computador e no celular.
