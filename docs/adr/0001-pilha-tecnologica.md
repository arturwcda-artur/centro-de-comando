# ADR 0001 — Pilha Next.js + Supabase + Vercel
**Status:** Aceita · **Data:** 2026-11-03

## Contexto
Plataforma privada de um usuário, web e celular, que deve evoluir por anos. O briefing sugeria Next.js, Supabase e Vercel.

## Decisão
Usar Next.js (App Router) + React + TypeScript + Tailwind + shadcn/ui; PostgreSQL gerenciado pelo Supabase (Auth, RLS, Vault, cron, Storage); hospedagem na Vercel; código no GitHub. Jobs começam com pg_cron/Edge Functions/Vercel Cron, sem serviço de filas pago.

## Consequências
Ecossistema maduro e barato para 1 usuário. Dependência de Supabase/Vercel mitigada por usar SQL padrão (migrations portáveis) e Next.js, que roda em outros hosts.
