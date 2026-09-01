-- ETAPA 11 - popup de cliente no /admin: upload de logo de verdade (em vez
-- de só campo de URL) + "visto por último" (proxy simples de "online",
-- sem presença em tempo real - ver components/ClienteModal.jsx). Rodar
-- depois de 012_aprovacao_cadastro.sql.

-- ============================================================
-- STORAGE - bucket público (dá pra usar a URL direto num <img>, sem URL
-- assinada) - diferente do bucket "contratos" (008), que é privado por
-- guardar documento do cliente. Logo é só identidade visual, já pensada
-- pra aparecer em petição exportada e no proprio app - não tem por que
-- esconder atrás de signed URL. Upload continua só via service role (sem
-- policy de INSERT em storage.objects) - mesmo raciocínio do bucket
-- "contratos": só o servidor decide quem pode escrever.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- ============================================================
-- ultimo_acesso - atualizado (fire-and-forget) toda vez que o advogado
-- carrega o layout autenticado (app/(app)/layout.jsx). "Online agora" no
-- /admin = atualizado nos últimos 5 minutos - suficiente pro admin
-- conferir "o sistema tá de pé" sem precisar de presença em tempo real
-- (Supabase Realtime), que é infra a mais pra um uso ocasional.
-- ============================================================
alter table advogados add column if not exists ultimo_acesso timestamptz;
