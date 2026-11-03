-- 0013 — Importação assistida de obras (Fase 4)
-- O agente local lê as pastas das obras e grava PROPOSTAS aqui. Nada vira obra sem o
-- proprietário revisar e aprovar cada proposta na tela "Importação assistida" (RN-04).

create table public.importacao_obras (
  id                   uuid primary key default gen_random_uuid(),
  -- identificação da origem (idempotência: reimportar a mesma pasta atualiza a proposta)
  fonte                text not null default 'pastas_locais',
  id_externo           text not null,                      -- caminho relativo da pasta
  pasta_local          text not null,                      -- caminho completo no PC
  -- sugestões (o proprietário confirma ou corrige)
  nome_sugerido        text not null,
  codigo_sugerido      text not null,
  situacao_sugerida    text not null check (situacao_sugerida in ('planejamento','andamento','paralisada','aguardando','concluida','cancelada')),
  pista_contratante    text,
  observacao           text,
  provavel_nao_obra    boolean not null default false,
  -- evidências lidas da pasta
  qtd_arquivos         integer not null default 0,
  qtd_cronogramas      integer not null default 0,
  qtd_planilhas        integer not null default 0,
  qtd_pdfs             integer not null default 0,
  tamanho_bytes        bigint  not null default 0,
  ultima_modificacao   timestamptz,
  estrutura_padrao     boolean not null default false,
  subpastas            text[] not null default '{}',
  -- revisão
  status               text not null default 'pendente' check (status in ('pendente','aprovada','descartada')),
  obra_id              uuid references public.obras(id) on delete set null,
  revisado_em          timestamptz,
  importado_em         timestamptz not null default now(),
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),
  unique (fonte, id_externo),
  check ((status = 'aprovada') = (obra_id is not null)),
  check ((status = 'pendente') = (revisado_em is null))
);
comment on table public.importacao_obras is
  'Propostas de obras lidas das pastas locais. Só viram obras após aprovação do proprietário.';
create index importacao_obras_pendentes_idx on public.importacao_obras (situacao_sugerida, nome_sugerido) where status = 'pendente';

select app.aplicar_padroes('public.importacao_obras');

-- Aprovação atômica: cria a obra e vincula a proposta na mesma transação.
-- security invoker: roda com as permissões (e o RLS) de quem chama.
create or replace function public.aprovar_importacao_obra(
  p_id uuid,
  p_codigo text,
  p_nome text,
  p_situacao text,
  p_empresa_id uuid default null,
  p_contratante_id uuid default null,
  p_cidade text default null,
  p_uf text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pasta text;
  v_obra  uuid;
begin
  select pasta_local into v_pasta
  from public.importacao_obras
  where id = p_id and status = 'pendente'
  for update;
  if not found then
    raise exception 'Proposta inexistente ou já revisada' using errcode = 'P0002';
  end if;

  insert into public.obras (codigo, nome, situacao, empresa_id, contratante_id, cidade, uf, pasta_local)
  values (trim(p_codigo), trim(p_nome), p_situacao, p_empresa_id, p_contratante_id,
          nullif(trim(p_cidade), ''), nullif(upper(trim(p_uf)), ''), v_pasta)
  returning id into v_obra;

  update public.importacao_obras
     set status = 'aprovada', obra_id = v_obra, revisado_em = now()
   where id = p_id;

  return v_obra;
end;
$$;

revoke all on function public.aprovar_importacao_obra(uuid, text, text, text, uuid, uuid, text, text) from public, anon;
grant execute on function public.aprovar_importacao_obra(uuid, text, text, text, uuid, uuid, text, text) to authenticated;
