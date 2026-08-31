-- ETAPA 1 (mínima, backfill) + ETAPA 2 - petições-base (referência de estilo)
-- e petições geradas. Rodar depois de 001_fundacao.sql.

-- ============================================================
-- ESCRITÓRIO: logo (Etapa 1 já previa a coluna, mas nenhuma tela usava, e
-- 001_fundacao.sql só tinha policy de SELECT - faltava UPDATE pra
-- /configuracoes conseguir salvar).
-- ============================================================

drop policy if exists "atualiza o proprio escritorio" on escritorios;
create policy "atualiza o proprio escritorio"
  on escritorios for update
  using (id = meu_escritorio_id())
  with check (id = meu_escritorio_id());

-- ============================================================
-- PETIÇÕES-BASE - referência de estilo por escritório + área do direito.
-- ============================================================

create table if not exists peticoes_base (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  area_direito text not null,
  titulo text not null,
  conteudo text not null,
  criado_por uuid references advogados(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists peticoes_base_escritorio_area_idx
  on peticoes_base (escritorio_id, area_direito);

alter table peticoes_base enable row level security;

drop policy if exists "ve peticoes_base do escritorio" on peticoes_base;
create policy "ve peticoes_base do escritorio"
  on peticoes_base for select
  using (escritorio_id = meu_escritorio_id());

drop policy if exists "cria peticoes_base no proprio escritorio" on peticoes_base;
create policy "cria peticoes_base no proprio escritorio"
  on peticoes_base for insert
  with check (escritorio_id = meu_escritorio_id());

drop policy if exists "deleta peticoes_base do escritorio" on peticoes_base;
create policy "deleta peticoes_base do escritorio"
  on peticoes_base for delete
  using (escritorio_id = meu_escritorio_id());

-- ============================================================
-- PETIÇÕES - geradas por IA a partir das petições-base como referência.
-- status é só um campo simples aqui ('rascunho' | 'finalizada') - o board
-- de revisão/protocolo é Etapa 6, não existe ainda.
-- ============================================================

create table if not exists peticoes (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  advogado_id uuid not null references advogados(id) on delete cascade,
  area_direito text not null,
  titulo text not null,
  conteudo text not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'finalizada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists peticoes_escritorio_idx on peticoes (escritorio_id, criado_em desc);
create index if not exists peticoes_advogado_idx on peticoes (advogado_id, criado_em desc);

alter table peticoes enable row level security;

drop policy if exists "ve peticoes do escritorio" on peticoes;
create policy "ve peticoes do escritorio"
  on peticoes for select
  using (escritorio_id = meu_escritorio_id());

drop policy if exists "cria peticoes no proprio escritorio" on peticoes;
create policy "cria peticoes no proprio escritorio"
  on peticoes for insert
  with check (escritorio_id = meu_escritorio_id() and advogado_id = auth.uid());

drop policy if exists "atualiza peticoes do escritorio" on peticoes;
create policy "atualiza peticoes do escritorio"
  on peticoes for update
  using (escritorio_id = meu_escritorio_id())
  with check (escritorio_id = meu_escritorio_id());
