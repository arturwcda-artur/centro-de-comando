# ADR 0011 — Segundo fator (MFA) exigido também no banco
**Status:** Aceita · **Data:** 2026-11-03

## Contexto
O login usa senha + código TOTP. Se a exigência do segundo fator existir só na aplicação, quem obtivesse a senha poderia chamar a API do Supabase diretamente com uma sessão de nível `aal1` e ler os dados.

## Decisão
Três camadas exigem `aal2` (senha + código): o `proxy.ts` (redireciona), o layout autenticado (`exigirSessaoCompleta`) e o **banco**, em que `app.is_proprietario()` passa a verificar `auth.jwt() ->> 'aal' = 'aal2'` (migration 0012). A regra de redirecionamento é uma função pura testada (`apps/web/src/lib/rotas.ts`).

## Consequências
Uma sessão só com senha não lê nem grava nada, mesmo fora da aplicação (teste em `modelo.test.js`). Se o celular com o autenticador for perdido, a recuperação é feita pelo painel do Supabase (remover o fator do usuário) — procedimento em SECURITY.md.
