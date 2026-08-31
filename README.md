# Plataforma Jurídica — Multi-tenant

Etapa 0 (Fundação): multi-tenant, autenticação, isolamento por escritório.
Base pra todas as próximas etapas (geração de petição, prazos, Diário
Oficial, notificações, Kanban) — nenhuma delas está aqui ainda, de propósito.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## Configuração (Supabase)

Usa o **mesmo projeto Supabase** do `demo-agentes-juridicos` (mesma base
Postgres, tabelas novas — não precisa criar projeto separado).

1. `.env.local` já está preenchido com as mesmas credenciais do outro
   projeto, mais `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → "service_role
   secret" no painel do Supabase — necessária pro provisionamento de
   escritório/advogado, que roda ignorando RLS).
2. **Rodar a migration**: painel do Supabase → SQL Editor → New query →
   colar o conteúdo de `supabase/migrations/001_fundacao.sql` → Run.

Sem isso, `/onboarding` (criar escritório) vai dar erro — a tabela
`escritorios` ainda não existe até a migration rodar.

## Como funciona

- **`/`** — login (e-mail + senha)
- **`/onboarding`** — cria Escritório + 1º Advogado (senha temporária
  gerada na hora, mostrada uma única vez na tela) + OABs (uma por estado)
- **`/trocar-senha`** — única tela acessível enquanto
  `advogados.precisa_trocar_senha` for `true`. O middleware força esse
  redirect em qualquer outra rota até a senha ser trocada.
- **`/dashboard`** — tela autenticada mínima (nome do escritório + OABs do
  advogado logado). Ponto de partida pras próximas etapas.

### Isolamento multi-tenant

Toda tabela sensível (`advogados`, `oabs`) tem RLS filtrando por
`escritorio_id` do advogado logado (`meu_escritorio_id()`, função helper na
migration). Trocar URL na mão não vaza dado de outro escritório — a
policy do banco bloqueia, não é só a tela que "esconde".

Criação de escritório/advogado/OAB roda no servidor com a service role key
(`lib/supabase/admin.js`, ignora RLS de propósito) — não existe policy de
INSERT direto do client, pra um usuário anônimo não conseguir criar
escritório fantasma direto pelo navegador.

### Senha

Login/senha ficam por conta do Supabase Auth (hash, sessão, cookie já
resolvidos) — a tabela `advogados` guarda só o perfil (nome,
`escritorio_id`, `precisa_trocar_senha`), não um `senha_hash` próprio. É
um desvio deliberado do modelo de dados descrito na Etapa 0: evita
reinventar segurança de senha na mão, cumprindo o mesmo requisito
funcional (senha temporária forçando troca no 1º acesso).

## Estrutura

- `middleware.js` — renova sessão do Supabase, redireciona: sem sessão →
  `/`; `precisa_trocar_senha` → `/trocar-senha`; sessão em `/` ou
  `/onboarding` → `/dashboard`
- `lib/supabase/server.js` — cliente Supabase pro servidor (cookies da
  sessão) + `obterUsuario()` com timeout (engasgo do Supabase não pode
  travar a página inteira)
- `lib/supabase/admin.js` — cliente com service role key, só pra
  provisionamento (`server-only`, quebra o build se importado num Client
  Component)
- `app/onboarding/actions.js` — Server Action que cria escritório +
  advogado + OABs, gera a senha temporária
- `app/trocar-senha/actions.js` — troca a senha e libera
  `precisa_trocar_senha`
- `app/(app)/layout.jsx` — shell autenticado com sidebar, confere sessão e
  `precisa_trocar_senha` de novo (defesa em profundidade além do middleware)
- `supabase/migrations/001_fundacao.sql` — schema (`escritorios`,
  `advogados`, `oabs`) + RLS

## Critérios de aceite da Etapa 0

- [x] Criar escritório, cadastrar advogado com 2 OABs de estados
      diferentes, fazer login com ele — testável em `/onboarding` depois da
      migration rodar
- [x] Isolamento por escritório via RLS (não só na tela — trocar URL na mão
      não vaza dado)
- [x] Login com senha temporária força troca antes de liberar qualquer
      outra tela (middleware + confirmação no layout)
