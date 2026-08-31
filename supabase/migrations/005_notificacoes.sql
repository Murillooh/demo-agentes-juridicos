-- ETAPA 5 - notificações (e-mail e WhatsApp) de prazo novo e atualização do
-- Diário Oficial. Rodar depois de 004_diario_oficial.sql.

-- ============================================================
-- CONTATO PARA WHATSAPP - e-mail já existe (advogados.email); WhatsApp
-- precisa de número em formato E.164 (ex.: +5511999998888).
-- ============================================================
alter table advogados add column if not exists telefone_whatsapp text;

-- ============================================================
-- PREFERÊNCIA DE CANAL - 1 linha por escritório. "por escritório e, se
-- fizer sentido, por advogado" da Etapa 5 virou: canal ativo é decisão do
-- escritório (linha única aqui), contato (telefone_whatsapp acima, e-mail
-- já existente) é por advogado - simples e já cobre o pedido sem duplicar
-- toggle em 2 lugares.
-- ============================================================
create table if not exists configuracoes_notificacao (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null unique references escritorios(id) on delete cascade,
  canal_email boolean not null default true,
  canal_whatsapp boolean not null default false,
  atualizado_em timestamptz not null default now()
);

alter table configuracoes_notificacao enable row level security;

drop policy if exists "ve config notificacao do escritorio" on configuracoes_notificacao;
create policy "ve config notificacao do escritorio"
  on configuracoes_notificacao for select using (escritorio_id = meu_escritorio_id());

-- Diferente de escritorios/atualizacoes_diario (provisionados só por
-- service role), essa preferência é autoatendimento legítimo do próprio
-- escritório - libera INSERT/UPDATE direto pra sessão do advogado (sem
-- isso, mudar o canal exigiria uma rota admin só pra essa config, e o
-- critério de aceite pede "vale a partir do próximo envio, sem deploy").
drop policy if exists "cria config notificacao do proprio escritorio" on configuracoes_notificacao;
create policy "cria config notificacao do proprio escritorio"
  on configuracoes_notificacao for insert with check (escritorio_id = meu_escritorio_id());

drop policy if exists "atualiza config notificacao do proprio escritorio" on configuracoes_notificacao;
create policy "atualiza config notificacao do proprio escritorio"
  on configuracoes_notificacao for update
  using (escritorio_id = meu_escritorio_id())
  with check (escritorio_id = meu_escritorio_id());

-- ============================================================
-- NOTIFICAÇÕES - fila de envio + histórico + central in-app, tudo na mesma
-- linha (mesmo padrão de "1 tabela cobre os 3 usos" já usado em
-- eventos_agenda na Etapa 3). unique(tipo_evento, evento_id, canal) é a
-- proteção contra duplicado - mesmo evento não gera 2 notificações no
-- mesmo canal (idêntico em espírito à unique de atualizacoes_diario).
-- status: pendente (aguardando 1ª tentativa ou retry) -> enviada (sucesso,
-- terminal) ou falha (esgotou tentativas, terminal).
-- ============================================================
create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  advogado_id uuid references advogados(id) on delete set null,
  tipo_evento text not null check (tipo_evento in ('prazo_novo', 'atualizacao_diario')),
  evento_id uuid not null,
  canal text not null check (canal in ('email', 'whatsapp')),
  destino text not null,
  titulo text not null,
  mensagem text not null,
  status text not null default 'pendente' check (status in ('pendente', 'enviada', 'falha')),
  tentativas int not null default 0,
  proxima_tentativa timestamptz not null default now(),
  erro_detalhe text,
  enviada_em timestamptz,
  lida boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (tipo_evento, evento_id, canal)
);

create index if not exists notificacoes_escritorio_idx on notificacoes (escritorio_id, criado_em desc);
create index if not exists notificacoes_fila_idx on notificacoes (status, proxima_tentativa) where status = 'pendente';

alter table notificacoes enable row level security;

drop policy if exists "ve notificacoes do escritorio" on notificacoes;
create policy "ve notificacoes do escritorio"
  on notificacoes for select using (escritorio_id = meu_escritorio_id());

drop policy if exists "marca lida notificacoes do escritorio" on notificacoes;
create policy "marca lida notificacoes do escritorio"
  on notificacoes for update
  using (escritorio_id = meu_escritorio_id())
  with check (escritorio_id = meu_escritorio_id());

-- Sem policy de INSERT de propósito - só o servidor (service role), a
-- partir de um evento real (prazo/atualização), enfileira notificação.
-- Igual atualizacoes_diario.
