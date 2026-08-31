-- ETAPA 8 - IA leitora de contratos. Módulo independente da geração de
-- petições (Etapa 2) - usa só a fundação multi-tenant da Etapa 0. Rodar
-- depois de 007_onedrive.sql.

-- ============================================================
-- STORAGE - bucket privado (sem policy de leitura pública em
-- storage.objects). Todo acesso ao arquivo original passa pelo servidor
-- com a service role key (app/api/contratos/[id]/arquivo, URL assinada de
-- 5min) - mesmo raciocínio já usado em integracoes_onedrive: em vez de
-- montar policy de storage.objects, a app decide quem pode ver o quê
-- checando a linha em "contratos" (que tem RLS normal) antes de gerar a
-- URL assinada.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('contratos', 'contratos', false)
on conflict (id) do nothing;

-- ============================================================
-- CONTRATOS - upload + extração de texto + leitura estruturada por IA.
-- partes/pontos_atencao em jsonb (são listas) - texto solto pros campos que
-- são naturalmente prosa (objeto, vigência, multa/rescisão).
--
-- status: 'sem_texto' cobre documento escaneado (sem camada de texto
-- extraível, precisaria de OCR - fora do escopo desta versão) SEPARADO de
-- 'falha' (erro real na extração ou na chamada da IA) de propósito - são
-- avisos diferentes pro advogado, não a mesma coisa disfarçada.
-- ============================================================
create table if not exists contratos (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id) on delete cascade,
  advogado_id uuid not null references advogados(id) on delete cascade,
  nome_arquivo text not null,
  tipo_arquivo text not null check (tipo_arquivo in ('pdf', 'docx')),
  caminho_armazenamento text not null,
  tamanho_bytes int,
  status text not null default 'processando' check (status in ('processando', 'concluido', 'sem_texto', 'falha')),
  erro text,
  texto_extraido text,
  texto_truncado_na_analise boolean not null default false,
  partes jsonb,
  objeto text,
  vigencia text,
  clausula_multa_rescisao text,
  pontos_atencao jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists contratos_escritorio_idx on contratos (escritorio_id, criado_em desc);

alter table contratos enable row level security;

drop policy if exists "ve contratos do escritorio" on contratos;
create policy "ve contratos do escritorio"
  on contratos for select using (escritorio_id = meu_escritorio_id());

drop policy if exists "cria contratos no proprio escritorio" on contratos;
create policy "cria contratos no proprio escritorio"
  on contratos for insert with check (escritorio_id = meu_escritorio_id() and advogado_id = auth.uid());

-- Permite reanalisar (botão "Tentar de novo" / "Analisar de novo") sem
-- precisar reprocessar o arquivo original - só reroda a IA em cima do
-- texto_extraido já salvo.
drop policy if exists "atualiza contratos do escritorio" on contratos;
create policy "atualiza contratos do escritorio"
  on contratos for update
  using (escritorio_id = meu_escritorio_id())
  with check (escritorio_id = meu_escritorio_id());
