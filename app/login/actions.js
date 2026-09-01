"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "../../lib/supabase/server";
import { souAdmin, COOKIE_SESSAO_ADMIN_ORIGINAL } from "../../lib/admin";
import { cookies } from "next/headers";

function traduzirErro(mensagem) {
  const mapa = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
  };
  return mapa[mensagem] || "Não foi possível entrar. Tente novamente.";
}

export async function entrar(_estadoAnterior, formData) {
  const email = String(formData.get("email") || "").trim();
  const senha = String(formData.get("senha") || "");

  if (!email || !senha) {
    return { erro: "Informe e-mail e senha." };
  }

  const supabase = criarClienteSupabaseServidor();
  if (!supabase) {
    return { erro: "Login ainda não configurado neste ambiente." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) {
    return { erro: traduzirErro(error.message) };
  }

  // Admin entra direto como a conta de visualização (mesma troca de "Ver
  // como advogado", automática) - /admin/entrar faz a troca e manda pro
  // /dashboard; volta pro painel de verdade só pelo botão em
  // Configurações. Mesma regra do middleware (rotaPublica + user), só que
  // aqui porque essa Server Action redireciona direto, sem passar pelo "/"
  // onde o middleware faria essa escolha sozinho.
  redirect(souAdmin(email) ? "/admin/entrar" : "/dashboard");
}

export async function sair() {
  const supabase = criarClienteSupabaseServidor();
  if (supabase) {
    await supabase.auth.signOut();
  }
  // Sessão de admin guardada (se saiu sem passar pelo botão "Painel do
  // administrador") não serve pra mais nada depois de um logout de
  // verdade - próxima vez que logar como admin, entrarComoAdvogado guarda
  // uma nova.
  cookies().delete(COOKIE_SESSAO_ADMIN_ORIGINAL);
  redirect("/");
}
