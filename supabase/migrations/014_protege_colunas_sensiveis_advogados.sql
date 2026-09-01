-- ETAPA 12 - varredura de isolamento multi-tenant. A policy "atualiza o
-- proprio registro" (001_fundacao.sql) trava QUAL linha o advogado
-- autenticado pode mexer (id = auth.uid()), mas não QUAIS colunas -
-- chamando o Supabase direto (browser, fora das Server Actions e suas
-- validações), dava pra:
--   - escritorio_id: trocar pro de OUTRO escritório -> meu_escritorio_id()
--     passa a devolver o do alvo, e toda policy do sistema (peticoes,
--     prazos, contratos, notificacoes, ...) libera leitura/escrita do
--     tenant inteiro do alvo. Vazamento cross-tenant completo.
--   - permissoes: setar a própria coluna pra null ("sem restrição") e
--     anular a permissão por tela que o admin configurou em /admin.
--   - aprovado: se auto-aprovar, pulando a fila de aprovação manual do
--     cadastro público (/onboarding).
--
-- Trigger em vez de mexer na RLS policy porque RLS só enxerga LINHA, não
-- COLUNA - é o jeito idiomático do Postgres/Supabase de travar campo
-- específico (ver docs do Supabase, "Protecting columns"). auth.role() =
-- 'authenticated' é só sessão comum (anon key + JWT do usuário) - as
-- Server Actions que legitimamente mexem nessas 3 colunas
-- (app/admin/actions.js, app/onboarding/actions.js) usam a service role
-- key (lib/supabase/admin.js), que o PostgREST marca como
-- auth.role() = 'service_role' - continuam passando direto, sem quebrar
-- nada. precisa_trocar_senha NÃO entra na lista - app/trocar-senha/
-- actions.js legitimamente zera essa coluna via sessão comum.
create or replace function bloquear_auto_promocao_advogado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    if new.escritorio_id is distinct from old.escritorio_id then
      raise exception 'Não é permitido trocar de escritório diretamente.';
    end if;
    if new.permissoes is distinct from old.permissoes then
      raise exception 'Não é permitido alterar permissões diretamente.';
    end if;
    if new.aprovado is distinct from old.aprovado then
      raise exception 'Não é permitido alterar o status de aprovação diretamente.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bloquear_auto_promocao_advogado on advogados;
create trigger bloquear_auto_promocao_advogado
  before update on advogados
  for each row
  execute function bloquear_auto_promocao_advogado();
