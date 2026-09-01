import { criarClienteSupabaseServidor, obterUsuario } from "./supabase/server";
import { souAdmin } from "./admin";

// Usada por /admin e pelas Server Actions de app/admin/actions.js pra
// confirmar, a partir do cookie de sessão da própria requisição, que quem
// está chamando é o admin - antes de qualquer operação com a service_role
// key (que ignora RLS). Separado de lib/admin.js (puro) pelo mesmo motivo
// documentado lá - next/headers não pode vazar pro bundle client.
export async function usuarioAdminDaRequisicao() {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!souAdmin(user?.email)) {
    // Log temporário pra debugar um "Acesso restrito" visto num teste
    // real - mostra se o problema é sessão não reconhecida (user null,
    // obterUsuario() deu timeout/erro) ou e-mail fora da allowlist
    // (user existe mas o e-mail não bate).
    console.error("[usuarioAdminDaRequisicao] negado - user:", user ? user.email : "null (sessão não reconhecida)");
    return null;
  }
  return user;
}
