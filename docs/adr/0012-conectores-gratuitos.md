# ADR 0012 — Conectores de leitura: iCal para o Google Agenda e GitHub Actions como agendador
**Status:** Aceita · **Data:** 2026-11-03

## Contexto
A Fase 5 traz a leitura do Trello, do Google Agenda e do Notion. Restrições:
- o sistema deve ser **totalmente gratuito** (decisão de custo zero);
- a leitura não pode alterar as ferramentas de origem (ADR 0005);
- a sincronização não deve depender do PC ligado.

No plano gratuito da Vercel (Hobby), os jobs agendados rodam no máximo uma vez por dia. O OAuth do Google exige criar um app no Google Cloud, e no modo de teste os tokens expiram a cada 7 dias.

## Decisão
1. **Google Agenda via endereço secreto iCal** de cada agenda. É somente leitura, por natureza, e dispensa app OAuth e verificação do Google. Cada endereço é tratado como segredo.
2. **Trello via API oficial**, com chave e token gerados pelo proprietário, usados só em chamadas de leitura (GET).
3. **Notion via integração interna**, com token e compartilhamento explícito apenas da página "Central de Gestão".
4. **Agendador: GitHub Actions** (`schedule`) a cada hora. Ele roda o sincronizador, que lê as fontes e faz *upsert* no Supabase. É gratuito no repositório privado (cerca de 720 min/mês, dentro da franquia de 2.000).
5. **Segredos:** os tokens, os endereços iCal e a chave de serviço ficam só como *GitHub Actions secrets*, cadastrados pelo proprietário. Não ficam no código, no banco nem na Vercel.

## Consequências
- Atraso de até 1 hora entre a mudança na origem e o sistema. Há também a opção "sincronizar agora", que dispara o workflow manualmente.
- O iCal não traz os participantes de forma estruturada, nem os eventos excluídos. Por isso a sincronização compara o conjunto de eventos da janela e marca como `cancelado` o que sumiu da origem, sem apagar.
- Se um dia for preciso **gravar** no Google Agenda, será necessário OAuth (novo ADR).
