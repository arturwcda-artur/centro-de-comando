# ADR 0021 — Assistente pelo Claude, só leitura

- **Data:** 2026-11-05
- **Status:** aceita

## Contexto

O proprietário quer um assistente com fonte e data, sem custo. Nenhuma API de IA gratuita atende: a do Gemini pode usar o conteúdo, e a do Claude é paga. Ele já usa o Claude, que aceita conectores remotos.

## Decisão

1. **Conector MCP em `/api/mcp`**, sem chat dentro do sistema e sem chave de IA.
2. **Login pelo servidor OAuth 2.1 do Supabase**, em beta. A tela `/oauth/consent` exige senha e segundo fator e só aceita o retorno oficial do Claude.
3. **Token OAuth não vale como proprietário.** `app.is_proprietario()` recusa token com `client_id`, então ele não lê nem grava tabelas.
4. **Só funções `assistente_*`**, que devolvem campos escolhidos, com fonte e data. Não exigem `aal2` no token, porque o Supabase não documenta esse valor; a garantia está na tela de autorização.
5. **Conteúdo com credencial fica de fora**, inclusive a lista de cartões pessoais. Descrições e comentários do Trello não são expostos.
6. **Revogação** pela tela Integrações.

## Consequências

- Sem custo novo; o uso consome o limite do plano do Claude.
- Dados consultados passam pela conta do Claude do proprietário.
- Títulos de tarefas são texto de terceiros: o conector avisa que são dados, e não há ferramenta de gravação para um texto malicioso explorar.
- Depender de recurso em beta pode exigir ajuste futuro. Se sair do ar, o sistema segue funcionando sem o assistente.
