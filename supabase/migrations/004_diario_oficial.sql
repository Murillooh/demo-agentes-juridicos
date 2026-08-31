-- ETAPA 4 - integração com o Diário Oficial (DJEN/CNJ). Rodar depois de
-- 003_prazos_agenda.sql.

-- ============================================================
-- OABS: quando cada uma foi consultada pela última vez - o job usa isso
-- pra buscar só o que é novo desde então (idempotência real, não só
-- "unique constraint pega duplicata" - evita reprocessar o histórico
-- inteiro toda hora).
-- ============================================================

alter table oabs add column if not exists ultima_verificacao_diario timestamptz;

-- ============================================================
-- PETIÇÕES: número de processo (opcional). Sem isso não tem como vincular
-- atualização do Diário a uma petição - a Etapa 2 não modelou "número de
-- processo" (petição ali é minuta gerada, não tem processo formal ainda).
-- Advogado preenche depois de protocolar, no editor da petição.
-- ============================================================

alter table peticoes add column if not exists numero_processo text;
create index if not exists peticoes_numero_processo_idx on peticoes (numero_processo) where numero_processo is not null;

-- ============================================================
-- ATUALIZAÇÕES DO DIÁRIO - uma linha por comunicação do DJEN que bateu com
-- uma OAB cadastrada. unique(oab_id, id_comunicacao_djen) é a idempotência:
-- rodar o job duas vezes não duplica (segunda tentativa de insert do mesmo
-- par vira conflito, ignorado).
-- ============================================================

create table if not exists atualizacoes_diario (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  oab_id uuid not null references oabs(id) on delete cascade,
  id_comunicacao_djen bigint not null,
  numero_processo text,
  tribunal text,
  orgao text,
  tipo_comunicacao text,
  texto text,
  data_disponibilizacao date not null,
  peticao_id uuid references peticoes(id) on delete set null,
  lida boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (oab_id, id_comunicacao_djen)
);

create index if not exists atualizacoes_diario_escritorio_idx
  on atualizacoes_diario (escritorio_id, data_disponibilizacao desc);

alter table atualizacoes_diario enable row level security;

drop policy if exists "ve atualizacoes do escritorio" on atualizacoes_diario;
create policy "ve atualizacoes do escritorio"
  on atualizacoes_diario for select using (escritorio_id = meu_escritorio_id());

drop policy if exists "marca lida atualizacoes do escritorio" on atualizacoes_diario;
create policy "marca lida atualizacoes do escritorio"
  on atualizacoes_diario for update
  using (escritorio_id = meu_escritorio_id())
  with check (escritorio_id = meu_escritorio_id());

-- Sem policy de INSERT de propósito - o job roda com a service role key
-- (mesmo padrão do provisionamento de escritório na Etapa 0), não por
-- sessão de advogado.
