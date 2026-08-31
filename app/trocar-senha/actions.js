"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor, obterUsuario } from "../../lib/supabase/server";

export async function trocarSenha(_estadoAnterior, formData) {
  const novaSenha = String(formData.get("novaSenha") || "");
  const confirmarSenha = String(formData.get("confirmarSenha") || "");

  if (novaSenha.length < 8) {
    return { erro: "A nova senha precisa ter pelo menos 8 caracteres." };
  }
  if (novaSenha !== confirmarSenha) {
    return { erro: "As senhas não coincidem." };
  }

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) {
    return { erro: "Sessão expirada. Entre novamente." };
  }

  const { error: erroSenha } = await supabase.auth.updateUser({ password: novaSenha });
  if (erroSenha) {
    return { erro: "Não foi possível trocar a senha. Tente novamente." };
  }

  // Só libera o resto do sistema depois que a troca de senha realmente
  // vingou (linha acima sem erro) - senão o middleware manda pra cá de
  // novo pra sempre, o que é o comportamento certo se isso falhar.
  const { error: erroPerfil } = await supabase
    .from("advogados")
    .update({ precisa_trocar_senha: false })
    .eq("id", user.id);
  if (erroPerfil) {
    return { erro: "Senha trocada, mas não foi possível atualizar seu perfil. Tente entrar de novo." };
  }

  redirect("/dashboard");
}
