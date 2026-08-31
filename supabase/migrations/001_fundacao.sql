-- ETAPA 0 - Fundação: multi-tenant, autenticação, isolamento por escritório.
-- Rodar no Supabase: painel do projeto -> SQL Editor -> New query -> colar
-- tudo isso -> Run. Mesmo projeto Supabase do demo-agentes-juridicos
-- (tabelas novas, não mexe nas existentes).

-- ============================================================
-- TABELAS
-- ============================================================

create table if not exists escritorios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  logo_url text,
  criado_em timestamptz not null default now()
);

-- advogados.id = auth.users.id (perfil 1:1). Login/senha ficam por conta do
-- Supabase Auth (hash, sessão, cookie já resolvidos e testados) - essa
-- tabela guarda só o que é específico do domínio: nome, a qual escritório
-- pertence, e se precisa trocar a senha temporária no próximo login.
create table if not exists advogados (
  id uuid primary key references auth.users(id) on delete cascade,
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  nome text not null,
  email text not null,
  precisa_trocar_senha boolean not null default false,
  criado_em timestamptz not null default now()
);

create index if not exists advogados_escritorio_id_idx on advogados (escritorio_id);

-- Um advogado pode ter várias OABs (uma por estado). "principal" marca qual
-- aparece em destaque (ex.: petições, assinatura) quando tem mais de uma.
create table if not exists oabs (
  id uuid primary key default gen_random_uuid(),
  advogado_id uuid not null references advogados(id) on delete cascade,
  numero text not null,
  estado_uf char(2) not null,
  principal boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (advogado_id, estado_uf)
);

create index if not exists oabs_advogado_id_idx on oabs (advogado_id);

-- Só 1 OAB "principal" por advogado. Constraint de banco em vez de confiar
-- só na aplicação pra não deixar - isolamento multi-tenant é regra de
-- arquitetura "desde já", o mesmo vale pra invariantes de dado.
create unique index if not exists oabs_uma_principal_por_advogado
  on oabs (advogado_id)
  where principal = true;

-- ============================================================
-- HELPER - escritório do usuário logado (evita repetir subquery em toda
-- policy e evita recursão de RLS ao consultar "advogados" de dentro da
-- própria policy de "advogados").
-- ============================================================

create or replace function meu_escritorio_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select escritorio_id from advogados where id = auth.uid();
$$;

-- ============================================================
-- RLS - isolamento por escritório. Nenhuma tabela sensível fica sem isso.
-- ============================================================

alter table escritorios enable row level security;
alter table advogados enable row level security;
alter table oabs enable row level security;

drop policy if exists "ve o proprio escritorio" on escritorios;
create policy "ve o proprio escritorio"
  on escritorios for select
  using (id = meu_escritorio_id());

drop policy if exists "ve advogados do mesmo escritorio" on advogados;
create policy "ve advogados do mesmo escritorio"
  on advogados for select
  using (escritorio_id = meu_escritorio_id());

drop policy if exists "atualiza o proprio registro" on advogados;
create policy "atualiza o proprio registro"
  on advogados for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "ve oabs do mesmo escritorio" on oabs;
create policy "ve oabs do mesmo escritorio"
  on oabs for select
  using (advogado_id in (select id from advogados where escritorio_id = meu_escritorio_id()));

-- Criação de escritório/advogado/OAB roda no servidor com a service role
-- key (lib/supabase/admin.js), que ignora RLS - não existe policy de
-- INSERT aqui de propósito. Um advogado recém-criado não tem como se
-- auto-cadastrar via client (evita usuário anônimo criando escritório
-- fantasma direto pelo navegador).
