# ADR 0010 — Next.js 16 sem `cacheComponents`
**Status:** Aceita · **Data:** 2026-11-03

## Contexto
O Next.js 16 traz `cacheComponents` ligado no modelo do `create-next-app`. Com ele, toda leitura de cookie/sessão precisa ficar atrás de `<Suspense>` e os dados tendem a ser servidos de cache. O Centro de Comando é privado, de um usuário, e cada tela precisa mostrar o dado atual do banco (prazos, saldos, vencimentos).

## Decisão
Desligar `cacheComponents` e `partialPrefetching`. Páginas autenticadas são renderizadas sob demanda a cada acesso; telas públicas (login, MFA, ícones, manifest) continuam estáticas.

## Consequências
Código mais simples e sem risco de exibir dado desatualizado ou de outra sessão. Custo: cada acesso consulta o banco — irrelevante no volume de um usuário. Pode ser revisto se o desempenho exigir.
