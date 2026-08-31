"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor } from "../../lib/supabase/server";

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

  redirect("/dashboard");
}

export async function sair() {
  const supabase = criarClienteSupabaseServidor();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/");
}
