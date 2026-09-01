"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "../../lib/supabase/server";
import { souAdmin } from "../../lib/admin";

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

  // Admin não tem linha em "advogados" - /dashboard quebra pra ele. Mesma
  // regra do middleware (rotaPublica + user), só que aqui porque essa
  // Server Action redireciona direto, sem passar pelo "/" onde o
  // middleware faria essa escolha sozinho.
  redirect(souAdmin(email) ? "/admin" : "/dashboard");
}

export async function sair() {
  const supabase = criarClienteSupabaseServidor();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/");
}
