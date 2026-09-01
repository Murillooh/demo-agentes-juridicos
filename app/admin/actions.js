"use server";

import { revalidatePath } from "next/cache";
import { usuarioAdminDaRequisicao } from "../../lib/admin-servidor";
import { criarClienteSupabaseAdmin } from "../../lib/supabase/admin";
import { gerarSenhaTemporaria } from "../../lib/senha-temporaria";
import { TELAS } from "../../lib/permissoes";
import { enviarEmail } from "../../lib/notificacoes/enviar-email";

const CHAVES_VALIDAS = TELAS.map((t) => t.chave);

function normalizarPermissoes(valor) {
  if (!Array.isArray(valor)) return null;
  return valor.filter((chave) => CHAVES_VALIDAS.includes(chave));
}

// Cria escritório + 1º advogado, igual app/onboarding/actions.js, mas sem
// exigir OAB (cliente demo pode nem ter à mão ainda) e já com white-label +
// permissão por tela definidos por quem está criando (só o admin chega
// aqui - usuarioAdminDaRequisicao confere antes de qualquer coisa com a
// service role key).
export async function criarContaCliente(_estadoAnterior, formData) {
  const admin = await usuarioAdminDaRequisicao();
  if (!admin) return { erro: "Acesso restrito ao administrador." };

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const nomeAdvogado = String(formData.get("nomeAdvogado") || "").trim();
  const nomeEscritorio = String(formData.get("nomeEscritorio") || "").trim();
  const logoUrl = String(formData.get("logoUrl") || "").trim();
  const corSistema = String(formData.get("corSistema") || "#c9a24b").trim();
  const permissoes = normalizarPermissoes(formData.getAll("permissoes"));

  if (!email || !email.includes("@")) return { erro: "Informe um e-mail válido." };
  if (!nomeAdvogado) return { erro: "Informe o nome do responsável." };
  if (!nomeEscritorio) return { erro: "Informe o nome do escritório/cliente." };

  const supabaseAdmin = criarClienteSupabaseAdmin();
  if (!supabaseAdmin) return { erro: "Não configurado neste ambiente (falta SUPABASE_SERVICE_ROLE_KEY)." };

  const senha = gerarSenhaTemporaria();

  const { data: usuarioCriado, error: erroUsuario } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });
  if (erroUsuario) {
    const mensagem = erroUsuario.message?.includes("already been registered")
      ? "Já existe uma conta com esse e-mail."
      : "Não foi possível criar a conta.";
    return { erro: mensagem };
  }

  const { data: escritorio, error: erroEscritorio } = await supabaseAdmin
    .from("escritorios")
    .insert({ nome: nomeEscritorio, logo_url: logoUrl || null, cor_sistema: corSistema })
    .select("id")
    .single();
  if (erroEscritorio) {
    await supabaseAdmin.auth.admin.deleteUser(usuarioCriado.user.id);
    return { erro: "Não foi possível criar o escritório." };
  }

  const { error: erroAdvogado } = await supabaseAdmin.from("advogados").insert({
    id: usuarioCriado.user.id,
    escritorio_id: escritorio.id,
    nome: nomeAdvogado,
    email,
    precisa_trocar_senha: true,
    permissoes,
  });
  if (erroAdvogado) {
    await supabaseAdmin.auth.admin.deleteUser(usuarioCriado.user.id);
    await supabaseAdmin.from("escritorios").delete().eq("id", escritorio.id);
    return { erro: "Não foi possível criar o acesso." };
  }

  revalidatePath("/admin");
  return { sucesso: true, email, senha };
}

export async function atualizarPermissoes(advogadoId, permissoes) {
  const admin = await usuarioAdminDaRequisicao();
  if (!admin) return { erro: "Acesso restrito." };

  const supabaseAdmin = criarClienteSupabaseAdmin();
  if (!supabaseAdmin) return { erro: "Não configurado." };

  await supabaseAdmin.from("advogados").update({ permissoes: normalizarPermissoes(permissoes) }).eq("id", advogadoId);
  revalidatePath("/admin");
  return { sucesso: true };
}

export async function atualizarWhiteLabel(escritorioId, logoUrl, corSistema) {
  const admin = await usuarioAdminDaRequisicao();
  if (!admin) return { erro: "Acesso restrito." };

  const supabaseAdmin = criarClienteSupabaseAdmin();
  if (!supabaseAdmin) return { erro: "Não configurado." };

  await supabaseAdmin.from("escritorios").update({ logo_url: logoUrl || null, cor_sistema: corSistema }).eq("id", escritorioId);
  revalidatePath("/admin");
  return { sucesso: true };
}

// Fila de "Solicitações de Acesso" (cadastro público via /onboarding,
// aprovado=false) - admin escolhe as telas e aprova, ou recusa (remove).
export async function aprovarConta(advogadoId, permissoes) {
  const admin = await usuarioAdminDaRequisicao();
  if (!admin) return { erro: "Acesso restrito." };

  const supabaseAdmin = criarClienteSupabaseAdmin();
  if (!supabaseAdmin) return { erro: "Não configurado." };

  const { data: conta, error } = await supabaseAdmin
    .from("advogados")
    .update({ aprovado: true, permissoes: normalizarPermissoes(permissoes) })
    .eq("id", advogadoId)
    .select("email, nome")
    .single();
  if (error) return { erro: "Não foi possível aprovar." };

  // Best-effort - se o e-mail falhar (Resend não configurado, etc.), a
  // aprovação já aconteceu de qualquer jeito, não desfaz por causa disso.
  await enviarEmail({
    to: conta.email,
    subject: "Seu acesso foi aprovado",
    texto: `Olá, ${conta.nome}!\n\nSeu acesso à Plataforma Jurídica foi aprovado. Já pode entrar normalmente com o e-mail e a senha que você cadastrou.`,
  }).catch(() => {});

  revalidatePath("/admin");
  return { sucesso: true };
}

// Recusar = remover a conta (cascade tira o advogado junto) - mesmo
// comportamento de "Recusar" no sistema anterior.
export async function recusarConta(advogadoId) {
  const admin = await usuarioAdminDaRequisicao();
  if (!admin) return { erro: "Acesso restrito." };

  const supabaseAdmin = criarClienteSupabaseAdmin();
  if (!supabaseAdmin) return { erro: "Não configurado." };

  await supabaseAdmin.auth.admin.deleteUser(advogadoId);
  revalidatePath("/admin");
  return { sucesso: true };
}

// Remove só a conta de advogado (auth.users) - o escritório fica órfão sem
// advogado nenhum, mas isso não é diferente de um escritório real perder
// seu único responsável; dado de petições/prazos etc. não é apagado junto
// (cascade é só advogado -> auth.users, não escritório -> tudo).
export async function removerConta(advogadoId) {
  const admin = await usuarioAdminDaRequisicao();
  if (!admin) return { erro: "Acesso restrito." };

  const supabaseAdmin = criarClienteSupabaseAdmin();
  if (!supabaseAdmin) return { erro: "Não configurado." };

  await supabaseAdmin.auth.admin.deleteUser(advogadoId);
  revalidatePath("/admin");
  return { sucesso: true };
}
