-- ETAPA 6 - board Kanban das petições (Criação / Revisão / Protocolo).
-- Rodar depois de 005_notificacoes.sql.

-- ============================================================
-- FASE DO BOARD - fase_atualizada_em marca quando entrou na fase atual
-- (base do indicador "parada há muito tempo"). responsavel_revisao_id e
-- responsavel_protocolo_id: quem recebe a notificação quando a petição
-- chega em cada fase - pode ser diferente de quem criou. "responsável pela
-- Criação" já existe (advogado_id), não precisa de coluna própria.
-- ============================================================
alter table peticoes add column if not exists fase_kanban text not null default 'criacao'
  check (fase_kanban in ('criacao', 'revisao', 'protocolo'));
alter table peticoes add column if not exists fase_atualizada_em timestamptz not null default now();
alter table peticoes add column if not exists responsavel_revisao_id uuid references advogados(id) on delete set null;
alter table peticoes add column if not exists responsavel_protocolo_id uuid references advogados(id) on delete set null;

create index if not exists peticoes_fase_idx on peticoes (escritorio_id, fase_kanban);

-- ============================================================
-- TRANSIÇÕES - log de cada mudança de coluna. Existe por 2 motivos: (1) dá
-- um id estável por movimentação real pra usar como evento_id da
-- notificação (evento_id de peticao_fase = id daqui, não peticao_id - senão
-- a unique(tipo_evento, evento_id, canal) da Etapa 5 deixaria notificar só
-- 1x por petição pra sempre, mesmo que ela volte e avance de novo depois);
-- (2) histórico auditável de quem moveu o quê e quando, de graça.
-- ============================================================
create table if not exists peticoes_transicoes (
  id uuid primary key default gen_random_uuid(),
  peticao_id uuid not null references peticoes(id) on delete cascade,
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  fase_anterior text not null,
  fase_nova text not null,
  movido_por uuid references advogados(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists peticoes_transicoes_peticao_idx on peticoes_transicoes (peticao_id, criado_em desc);

alter table peticoes_transicoes enable row level security;

drop policy if exists "ve transicoes do escritorio" on peticoes_transicoes;
create policy "ve transicoes do escritorio"
  on peticoes_transicoes for select using (escritorio_id = meu_escritorio_id());

drop policy if exists "cria transicoes no proprio escritorio" on peticoes_transicoes;
create policy "cria transicoes no proprio escritorio"
  on peticoes_transicoes for insert with check (escritorio_id = meu_escritorio_id());

-- ============================================================
-- NOTIFICAÇÕES - novo tipo de evento pro trigger "mudou de fase" da
-- Etapa 6, junto dos 2 já existentes da Etapa 5.
-- ============================================================
alter table notificacoes drop constraint if exists notificacoes_tipo_evento_check;
alter table notificacoes add constraint notificacoes_tipo_evento_check
  check (tipo_evento in ('prazo_novo', 'atualizacao_diario', 'peticao_fase'));

-- ============================================================
-- REALTIME - o board não pode depender de reload manual pra refletir
-- mudança feita por outra sessão/aba (critério de aceite explícito da
-- Etapa 6). replica identity full: sem isso o Postgres só manda a chave
-- primária no payload de UPDATE, e o filtro por escritorio_id no canal
-- (lib/supabase/client.js) não teria coluna pra comparar.
-- ============================================================
alter table peticoes replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'peticoes'
  ) then
    alter publication supabase_realtime add table peticoes;
  end if;
end $$;
