-- ETAPA 10 (complemento) - fila de aprovação pra cadastro público
-- (/onboarding). Faltou portar isso do demo-agentes-juridicos junto com o
-- resto do painel admin. Rodar depois de 011_admin_permissoes_datajud.sql.

-- default true - sem isso, toda conta já existente (inclusive as criadas
-- via /demo e pelo próprio painel admin) ficaria trancada retroativamente.
-- Só /onboarding (cadastro público de escritório novo) passa a nascer com
-- aprovado=false explicitamente - /demo continua instantâneo de propósito
-- (é sandbox compartilhado, não faz sentido pedir aprovação pra isso).
alter table advogados add column if not exists aprovado boolean not null default true;
