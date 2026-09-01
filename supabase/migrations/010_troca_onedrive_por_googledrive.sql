-- ETAPA 7 (revisão) - troca a integração de OneDrive por Google Drive.
-- Ninguém chegou a conectar uma conta Microsoft de verdade (credenciais
-- nunca foram configuradas) - sem dado real em jogo, a troca é limpa: dropa
-- o que a migration 007 criou, recria equivalente pro Google. Rodar depois
-- de 009_demo_e_tour.sql.

-- ============================================================
-- Tira o que era do OneDrive.
-- ============================================================
drop table if exists integracoes_onedrive;

alter table peticoes drop column if exists onedrive_status;
alter table peticoes drop column if exists onedrive_caminho;
alter table peticoes drop column if exists onedrive_link;
alter table peticoes drop column if exists onedrive_erro;
alter table peticoes drop column if exists onedrive_atualizado_em;
alter table peticoes drop column if exists onedrive_tentativas;

-- ============================================================
-- STATUS DO ENVIO - por petição, independente da conexão (mesma garantia
-- de "desconectar e reconectar não perde petição já salva" da versão
-- OneDrive). googledrive_arquivo_id: id do arquivo já criado - reenviar
-- ATUALIZA esse arquivo em vez de criar um novo (Drive aceita nome
-- duplicado numa pasta, não é filesystem).
-- ============================================================
alter table peticoes add column if not exists googledrive_status text check (googledrive_status in ('pendente', 'enviado', 'falha'));
alter table peticoes add column if not exists googledrive_arquivo_id text;
alter table peticoes add column if not exists googledrive_link text;
alter table peticoes add column if not exists googledrive_erro text;
alter table peticoes add column if not exists googledrive_atualizado_em timestamptz;
alter table peticoes add column if not exists googledrive_tentativas int not null default 0;

-- ============================================================
-- CONEXÃO GOOGLE - 1 linha por escritório (existir = conectado; DELETE =
-- desconectado). pasta_raiz_id/pasta_clientes_id: cache dos 2 primeiros
-- níveis da árvore de pastas (Escritório/Clientes), resolvidos 1x só -
-- sem path-based addressing como o OneDrive, resolver de novo em toda
-- petição seria 2 chamadas a mais por envio à toa.
--
-- Mesma concessão de RLS da versão OneDrive: SELECT direto pro próprio
-- escritório (não só service role) porque a tela de status precisa ler
-- sem rota admin - escritório é a fronteira de confiança em todo o resto
-- do schema, não advogado individual.
-- ============================================================
create table if not exists integracoes_googledrive (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null unique references escritorios(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expira_em timestamptz not null,
  email_conta_google text,
  status text not null default 'ativa' check (status in ('ativa', 'expirada')),
  pasta_raiz_id text,
  pasta_clientes_id text,
  ultima_sincronizacao timestamptz,
  ultimo_erro text,
  criado_em timestamptz not null default now()
);

alter table integracoes_googledrive enable row level security;

drop policy if exists "ve integracao googledrive do escritorio" on integracoes_googledrive;
create policy "ve integracao googledrive do escritorio"
  on integracoes_googledrive for select using (escritorio_id = meu_escritorio_id());
