-- ETAPA 7 - integração com OneDrive (Microsoft Graph API), por escritório.
-- Rodar depois de 006_kanban.sql.

-- ============================================================
-- CLIENTE + STATUS DO UPLOAD - nome_cliente é o que faltava pra montar a
-- convenção de pasta "por cliente" pedida na Etapa 7 (nenhuma etapa
-- anterior capturou isso, editável no editor da petição, igual
-- numero_processo na Etapa 4). onedrive_* vivem na própria petição,
-- independente da linha de conexão em integracoes_onedrive - é isso que
-- garante "desconectar e reconectar não perde petição já salva" (o
-- histórico do envio não depende da conexão existir).
-- ============================================================
alter table peticoes add column if not exists nome_cliente text;
alter table peticoes add column if not exists onedrive_status text check (onedrive_status in ('pendente', 'enviado', 'falha'));
alter table peticoes add column if not exists onedrive_caminho text;
alter table peticoes add column if not exists onedrive_link text;
alter table peticoes add column if not exists onedrive_erro text;
alter table peticoes add column if not exists onedrive_atualizado_em timestamptz;
alter table peticoes add column if not exists onedrive_tentativas int not null default 0;

-- ============================================================
-- CONEXÃO MICROSOFT - 1 linha por escritório (existir = conectado; DELETE =
-- desconectado, é a ação "Desconectar"). status 'expirada' cobre token
-- revogado/refresh falhando - fica visível em Integrações sem derrubar
-- upload de petição nova (enviarPeticaoParaOneDrive trata isso como falha
-- normal registrada na própria petição, nunca como exceção).
--
-- RLS aqui é diferente do resto do schema: dá SELECT direto pro próprio
-- escritório (não só service role), porque a tela de status precisa
-- mostrar conectado/desconectado sem passar por rota admin. access_token/
-- refresh_token ficam nessa mesma linha - concessão consciente: qualquer
-- advogado do MESMO escritório consegue ler o token via API direta, mas é
-- o mesmo raciocínio de confiança que já vale pro resto do schema inteiro
-- (escritório é a fronteira de confiança, não advogado individual - todo
-- mundo já vê as mesmas petições, prazos etc). INSERT/UPDATE/DELETE
-- continuam só via service role (rotas de OAuth e "Desconectar").
-- ============================================================
create table if not exists integracoes_onedrive (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null unique references escritorios(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expira_em timestamptz not null,
  email_conta_ms text,
  status text not null default 'ativa' check (status in ('ativa', 'expirada')),
  ultima_sincronizacao timestamptz,
  ultimo_erro text,
  criado_em timestamptz not null default now()
);

alter table integracoes_onedrive enable row level security;

drop policy if exists "ve integracao onedrive do escritorio" on integracoes_onedrive;
create policy "ve integracao onedrive do escritorio"
  on integracoes_onedrive for select using (escritorio_id = meu_escritorio_id());
