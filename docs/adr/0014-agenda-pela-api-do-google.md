# ADR 0014 — Agenda controlada pela API do Google
**Status:** Aceita · **Data:** 2026-11-04 · Altera os ADRs 0012 e 0013

## Contexto
O proprietário quer controlar a agenda pelo sistema. O iCal só permite leitura e demora a refletir mudanças, então gravar pela API e ler pelo iCal mostraria compromissos duplicados ou atrasados.

## Decisão
1. **Leitura e gravação pela API oficial** (Google Calendar API, gratuita), na agenda principal do proprietário, com o escopo `calendar.events`.
2. **Autorização:** o proprietário clica em **Integrações → Conectar Google**. O clique, com a tela de consentimento do Google, é a autorização de escrita (RN-64) e fica registrado em `conectores.escrita_autorizada_em`.
3. **Token no cofre:** o token de longa duração fica no Supabase Vault, nome `cc_google`, e não vai para variáveis, tabelas comuns ou logs. A aplicação lê com `ler_credencial` (exige proprietário com segundo fator) e o sincronizador com `ler_credencial_servico` (só a chave de serviço).
4. **Operações:** criar, alterar e excluir compromissos. Em evento recorrente, alterar e excluir valem **só para aquela data**.
5. **Exclusão:** é a exceção à regra de nada excluir do ADR 0013, só no Google Agenda e com confirmação na tela. O sistema mantém o registro com `cancelado_em`. No Trello e no Notion, nada muda: nada é excluído.
6. **Ordem de gravação:** primeiro o Google, depois o sistema. Se o Google recusar, nada muda e o erro aparece na tela. Cada gravação fica em `operacoes_externas`.
7. **Substituição do iCal:** na primeira leitura pela API, as cópias vindas do iCal recebem `cancelado_em`. Nada é apagado. Sem conexão feita, a leitura continua pelo iCal.
8. **Obra do compromisso:** o vínculo com a obra fica só no sistema e não vai para o Google.

## Alternativas descartadas
- **Manter o iCal para leitura:** atraso de horas e identificadores diferentes dos da API.
- **Guardar o token como variável na Vercel e no GitHub:** exigiria copiar à mão a cada reconexão.

## Consequências
- O app do Google precisa ficar **publicado** (em produção). Em modo de teste, o Google derruba a autorização a cada 7 dias.
- Como o app não passa pela verificação do Google, a tela de autorização mostra um aviso, que o proprietário confirma em **Avançado**.
- Se a autorização for revogada, o conector fica em "Erro de autorização" e basta usar **Reconectar Google**.
- Convites de outras pessoas podem ser recusados pelo Google ao alterar: o erro aparece na tela.
- Outras agendas além da principal não entram nesta etapa.
