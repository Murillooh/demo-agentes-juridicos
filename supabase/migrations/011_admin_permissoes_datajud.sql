-- ETAPA 10 - painel admin (só o dono da plataforma), white-label por
-- escritório, permissão por tela, e busca/acompanhamento de processo via
-- DataJud. Rodar depois de 010_troca_onedrive_por_googledrive.sql.

-- ============================================================
-- WHITE-LABEL - cor de destaque por escritório (logo_url já existe desde a
-- Etapa 0). Default = o dourado atual, escritório existente não muda de
-- cara sozinho quando essa coluna aparece.
-- ============================================================
alter table escritorios add column if not exists cor_sistema text not null default '#c9a24b';

-- ============================================================
-- PERMISSÃO POR TELA - null = acesso liberado em tudo (padrão de quem
-- passou por /onboarding ou /demo, mesmo comportamento de sempre). Só
-- fica restrito quem o admin (painel /admin) criar com uma lista
-- explícita - mesma semântica de lib/permissoes.js do sistema anterior.
-- ============================================================
alter table advogados add column if not exists permissoes jsonb;

-- ============================================================
-- PROCESSOS ACOMPANHADOS - lista por escritório de números CNJ sob
-- monitoramento. unique(escritorio_id, numero_cnj) evita acompanhar o
-- mesmo processo 2x. Sem policy de UPDATE de propósito - só o job
-- (service role, lib/verificar-processos.js) atualiza situacao_atual/
-- ultima_verificacao, mesmo padrão de atualizacoes_diario/oabs.
-- ============================================================
create table if not exists processos_monitorados (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  advogado_id uuid not null references advogados(id) on delete cascade,
  numero_cnj text not null,
  tribunal text not null,
  situacao_atual text,
  ultimo_andamento_data date,
  ultima_verificacao timestamptz,
  criado_em timestamptz not null default now(),
  unique (escritorio_id, numero_cnj)
);

create index if not exists processos_monitorados_escritorio_idx on processos_monitorados (escritorio_id);

alter table processos_monitorados enable row level security;

drop policy if exists "ve processos acompanhados do escritorio" on processos_monitorados;
create policy "ve processos acompanhados do escritorio"
  on processos_monitorados for select using (escritorio_id = meu_escritorio_id());

drop policy if exists "cria processos acompanhados no proprio escritorio" on processos_monitorados;
create policy "cria processos acompanhados no proprio escritorio"
  on processos_monitorados for insert with check (escritorio_id = meu_escritorio_id() and advogado_id = auth.uid());

drop policy if exists "deleta processos acompanhados do escritorio" on processos_monitorados;
create policy "deleta processos acompanhados do escritorio"
  on processos_monitorados for delete using (escritorio_id = meu_escritorio_id());

-- notificacoes ganha mais 1 tipo de evento (processo com andamento novo),
-- junto dos 3 já existentes.
alter table notificacoes drop constraint if exists notificacoes_tipo_evento_check;
alter table notificacoes add constraint notificacoes_tipo_evento_check
  check (tipo_evento in ('prazo_novo', 'atualizacao_diario', 'peticao_fase', 'processo_atualizado'));
