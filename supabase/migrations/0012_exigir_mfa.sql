-- 0012 — MFA exigido também no banco (Fase 3)
-- A tela já obriga o segundo fator, mas a proteção não pode depender só da aplicação:
-- uma sessão com apenas senha (aal1) passa a não enxergar nada, mesmo usando a API diretamente.

create or replace function app.is_proprietario()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (select 1 from app.proprietario p where p.user_id = auth.uid());
$$;
comment on function app.is_proprietario() is
  'Verdadeiro se o usuário autenticado é o proprietário E concluiu o segundo fator (aal2). Base de todas as políticas RLS.';
