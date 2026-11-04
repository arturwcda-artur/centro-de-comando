# ADR 0013 — O Centro de Comando passa a comandar as tarefas e a agenda do proprietário
**Status:** Aceita · **Data:** 2026-11-04 · Altera os ADRs 0004, 0005 e 0012

## Contexto
O sistema nasceu como espelho somente leitura. Com o uso real, o proprietário definiu: *"lá devo controlar tudo; a única coisa que não devo controlar pelo sistema são tarefas de terceiros abertas no Trello"*.

## Decisão
1. **Etapa 1 (esta):** concluir tarefas próprias no sistema reflete na origem.
   - Trello: move o cartão para a lista de concluídos do quadro; sem essa lista, marca o cartão como concluído.
   - Notion: muda a situação para a opção de concluído da própria base.
   - Cartões de terceiros (atribuídos a outros membros) continuam só leitura.
2. **Etapa 2 (próxima):** controlar o Google Agenda exige OAuth, porque o iCal só permite leitura. Terá ADR próprio.
3. **Escopo mínimo de escrita:** só as operações listadas aqui. **Nada é excluído nem arquivado** nas ferramentas de origem.
4. **Ordem de gravação:** primeiro a origem, depois o sistema. Se a origem recusar, a tarefa continua aberta e o erro aparece na tela.
5. **Rastreabilidade:** cada gravação fica em `operacoes_externas`. A autorização fica em `conectores.escrita_autorizada_em`, e a sincronização nunca a altera.
6. **Credenciais:** para agir na hora, a aplicação usa `TRELLO_API_KEY`, `TRELLO_TOKEN` e `NOTION_TOKEN` como variáveis **só de servidor** na Vercel, sem prefixo `NEXT_PUBLIC_`.

## Consequências
- O ADR 0004 muda: tarefas próprias passam a ser comandadas pelo sistema, embora o conteúdo continue vindo da origem.
- A RN-47 fica restrita: tarefas importadas não são editadas aqui, exceto a conclusão.
- Os tokens passam a existir em dois lugares (GitHub Actions e Vercel). Ao trocar um token, atualizar os dois.

## Hospedagem (registro da decisão de 04/11/2026)
Testamos a Cloudflare Workers gratuita como alternativa à Vercel, cujo plano Hobby é restrito a uso pessoal e não comercial. Resultado: compilou (2,5 MiB), 140 acessos com 0 erros, mas **CPU mediana de 22 ms, contra o limite publicado de 10 ms**, e `proxy.ts` em modo experimental. O proprietário decidiu ficar na Vercel. A configuração do teste está na branch local `teste/cloudflare`; o plano pago da Cloudflare seria a saída se os termos da Vercel se tornarem um problema.
