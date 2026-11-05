# ADR 0018 — Índice de documentos e abertura pelo Google Drive
**Status:** Aceita · **Data:** 2026-11-05 · Detalha o ADR 0003

## Contexto
O proprietário quer achar qualquer documento da obra por nome ou conteúdo e abrir no computador ou no celular. O navegador não abre arquivo de pasta local.

## Decisão
1. **Índice local:** o agente percorre a pasta da obra sem alterar nada e envia nome, categoria e até 50 mil caracteres de texto.
2. **O que mudou:** é identificado por tamanho e data de modificação, sem ler o conteúdo.
3. **Segurança do índice:** só depois de percorrer a pasta inteira o agente arquiva o que sumiu. Pasta inacessível ou vazia nunca arquiva nada.
4. **Abertura:** pelo link do Google Drive, com o escopo `drive.metadata.readonly`, que dá acesso só aos dados dos arquivos. O sincronizador liga cada documento pelo caminho.
5. **Pastas com o mesmo nome:** vale a que tem mais caminhos iguais aos do índice.
6. **Links fora de `documentos`:** ficam em `documento_links`, sem auditoria. Gravar em `documentos` copiaria o texto inteiro para a auditoria a cada mudança de link.
7. **Credenciais:** nomes ligados a credenciais não entram. Texto com o padrão de RN-66 não é copiado, e o arquivo entra só pelo nome.
8. **PDF digitalizado:** sem OCR nesta fase. Entra pelo nome e aparece marcado.
9. **Obsoletos:** ficam no índice, mas fora da busca por padrão.

## Alternativas descartadas
- **Ler tudo pela API do Drive:** exigiria o escopo de conteúdo e baixar 6 GB.
- **Só mostrar o caminho:** não abriria no celular.

## Consequências
- O texto de `documentos` fica sujeito à auditoria, por isso ocupa cerca do dobro do espaço. A tela Integrações mostra o consumo.
- A busca em português não ignora acentos: `medicao` não acha `medição`.
- O escopo do Drive é restrito no Google, então o aviso de app não verificado fica mais forte.
- Um arquivo renomeado perde o link até a sincronização seguinte.
