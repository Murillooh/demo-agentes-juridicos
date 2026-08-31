-- ETAPA 9 - acesso demo, tour de boas-vindas, polimento. Rodar depois de
-- 008_contratos.sql.

-- ============================================================
-- ESCRITÓRIO DEMO - marca qual escritório é o "sandbox" compartilhado que
-- /demo usa (a query de app/demo/actions.js procura por is_demo=true, não
-- por nome - nome pode mudar sem quebrar o fluxo). Só 1 verdadeiro por
-- vez faz sentido de verdade (não dá pra saber em qual "sandbox" colocar
-- um novo acesso se houver mais de um) - constraint de banco em vez de só
-- confiar na aplicação, mesmo raciocínio já usado em "1 OAB principal por
-- advogado" na Etapa 0.
-- ============================================================
alter table escritorios add column if not exists is_demo boolean not null default false;

create unique index if not exists escritorios_um_demo_por_vez
  on escritorios (is_demo)
  where is_demo = true;

-- ============================================================
-- TOUR DE BOAS-VINDAS - mostrado 1x no /dashboard enquanto for false.
-- ============================================================
alter table advogados add column if not exists tour_visto boolean not null default false;
