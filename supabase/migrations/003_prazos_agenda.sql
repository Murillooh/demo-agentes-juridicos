-- ETAPA 3 - prazos (via IA) e agenda. Rodar depois de 002_peticoes.sql.

-- ============================================================
-- PRAZOS - extraídos de despacho colado pelo advogado, via IA.
-- Campos além do modelo literal da Etapa 3: escritorio_id (RLS - regra de
-- arquitetura "desde já" da Etapa 0, não dá pra confiar só no join via
-- peticao_id), data_despacho (base do cálculo, precisa aparecer na tela
-- pro advogado conferir), criado_por.
-- ============================================================

create table if not exists prazos (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  peticao_id uuid not null references peticoes(id) on delete cascade,
  despacho_texto text not null,
  descricao_prazo text not null,
  data_despacho date not null,
  data_limite date not null,
  status text not null default 'pendente' check (status in ('pendente', 'cumprido', 'perdido')),
  criado_por uuid references advogados(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists prazos_escritorio_idx on prazos (escritorio_id, data_limite);
create index if not exists prazos_peticao_idx on prazos (peticao_id);

alter table prazos enable row level security;

drop policy if exists "ve prazos do escritorio" on prazos;
create policy "ve prazos do escritorio"
  on prazos for select using (escritorio_id = meu_escritorio_id());

drop policy if exists "cria prazos no proprio escritorio" on prazos;
create policy "cria prazos no proprio escritorio"
  on prazos for insert with check (escritorio_id = meu_escritorio_id());

drop policy if exists "atualiza prazos do escritorio" on prazos;
create policy "atualiza prazos do escritorio"
  on prazos for update using (escritorio_id = meu_escritorio_id()) with check (escritorio_id = meu_escritorio_id());

-- ============================================================
-- EVENTOS DE AGENDA - prazo (criado automático a partir de um Prazo) ou
-- reunião (criada manualmente, opcionalmente vinculada a uma petição).
-- prazo_id além do modelo literal: back-reference pro Prazo de origem,
-- pra edição/cancelamento do prazo conseguir achar o evento correspondente
-- sem duplicar data/titulo em dois lugares que podem desalinhar.
-- ============================================================

create table if not exists eventos_agenda (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  advogado_id uuid not null references advogados(id) on delete cascade,
  tipo text not null check (tipo in ('prazo', 'reuniao')),
  titulo text not null,
  data date not null,
  peticao_id uuid references peticoes(id) on delete set null,
  prazo_id uuid references prazos(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create index if not exists eventos_agenda_escritorio_data_idx on eventos_agenda (escritorio_id, data);

alter table eventos_agenda enable row level security;

drop policy if exists "ve eventos do escritorio" on eventos_agenda;
create policy "ve eventos do escritorio"
  on eventos_agenda for select using (escritorio_id = meu_escritorio_id());

drop policy if exists "cria eventos no proprio escritorio" on eventos_agenda;
create policy "cria eventos no proprio escritorio"
  on eventos_agenda for insert with check (escritorio_id = meu_escritorio_id() and advogado_id = auth.uid());

drop policy if exists "deleta eventos do escritorio" on eventos_agenda;
create policy "deleta eventos do escritorio"
  on eventos_agenda for delete using (escritorio_id = meu_escritorio_id());
