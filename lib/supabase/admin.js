import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente com a service role key - IGNORA row level security e pode criar
// usuários direto (auth.admin.*). Só pra operações de provisionamento que
// não têm como rodar com um usuário logado ainda (criar escritório + 1º
// advogado). NUNCA importar isso num Client Component - "server-only"
// quebra o build se alguém tentar.
//
// Sem service role key configurada, devolve null (mesmo padrão de
// degradação do cliente comum) em vez de derrubar a rota com exceção.
export function criarClienteSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
