"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { usuarioAdminDaRequisicao } from "../../lib/admin-servidor";
import { criarClienteSupabaseAdmin } from "../../lib/supabase/admin";
import { criarClienteSupabaseServidor } from "../../lib/supabase/server";
import { gerarSenhaTemporaria } from "../../lib/senha-temporaria";
import { TELAS } from "../../lib/permissoes";
import { enviarEmail } from "../../lib/notificacoes/enviar-email";
import { EMAIL_PREVIEW_ADVOGADO, COOKIE_SESSAO_ADMIN_ORIGINAL } from "../../lib/admin";

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

export async function atualizarInfoCliente(escritorioId, nome, corSistema) {
  const admin = await usuarioAdminDaRequisicao();
  if (!admin) return { erro: "Acesso restrito." };
  if (!nome?.trim()) return { erro: "Informe o nome do escritório." };

  const supabaseAdmin = criarClienteSupabaseAdmin();
  if (!supabaseAdmin) return { erro: "Não configurado." };

  await supabaseAdmin.from("escritorios").update({ nome: nome.trim(), cor_sistema: corSistema }).eq("id", escritorioId);
  revalidatePath("/admin");
  return { sucesso: true };
}

const TIPOS_LOGO_ACEITOS = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" };
const TAMANHO_MAXIMO_LOGO = 3 * 1024 * 1024;

// Upload de verdade (em vez de só campo de URL) - bucket público "logos"
// (migration 013), sempre via service role (mesmo raciocínio do bucket
// "contratos" em app/(app)/contratos/actions.js: sem policy de INSERT em
// storage.objects, só o servidor decide quem escreve). upsert:true porque
// aqui é sempre "trocar a logo atual", não um arquivo novo por vez.
//
// escritorioId vem "pré-preenchido" via .bind(null, escritorioId) no
// componente (ClienteModal) - useFormState sempre chama a action com
// (estadoAnterior, formData) por conta própria, então esses dois ficam
// depois do argumento fixado pelo bind.
export async function uploadLogoCliente(escritorioId, _estadoAnterior, formData) {
  const admin = await usuarioAdminDaRequisicao();
  if (!admin) return { erro: "Acesso restrito." };

  const arquivo = formData.get("logo");
  if (!arquivo || typeof arquivo === "string" || !arquivo.size) return { erro: "Selecione uma imagem." };

  const extensao = TIPOS_LOGO_ACEITOS[arquivo.type];
  if (!extensao) return { erro: "Formato não suportado - envie PNG, JPG, WEBP ou SVG." };
  if (arquivo.size > TAMANHO_MAXIMO_LOGO) return { erro: "Imagem muito grande (máximo 3MB)." };

  const supabaseAdmin = criarClienteSupabaseAdmin();
  if (!supabaseAdmin) return { erro: "Não configurado." };

  const caminho = `${escritorioId}/logo.${extensao}`;
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const { error: erroUpload } = await supabaseAdmin.storage.from("logos").upload(caminho, bytes, {
    contentType: arquivo.type,
    upsert: true,
  });
  if (erroUpload) return { erro: "Não foi possível enviar a imagem. Tente novamente." };

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("logos").getPublicUrl(caminho);
  // Cache-bust - mesmo caminho de sempre (upsert), sem isso o navegador
  // continua mostrando a logo antiga em cache depois de trocar.
  const logoUrl = `${publicUrl}?v=${Date.now()}`;

  await supabaseAdmin.from("escritorios").update({ logo_url: logoUrl }).eq("id", escritorioId);
  revalidatePath("/admin");
  return { sucesso: true, logoUrl };
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

// "Ver como advogado" - troca a sessão do admin pela de uma conta fixa
// dentro do escritório is_demo=true (mesmo sandbox do fluxo público /demo,
// já populado com petições/prazos/contratos de exemplo - dá pra clicar em
// tudo de verdade em vez de tela vazia). Sem senha fixa guardada em lugar
// nenhum: gera uma nova a cada clique via service role e faz login com ela
// na hora, no mesmo cliente Supabase preso à requisição (mesmo client que
// entrar() usa) - é o que troca o cookie de sessão de admin pro advogado
// de visualização. Antes de trocar, guarda o access/refresh token da
// sessão de admin ATUAL num cookie httpOnly separado (COOKIE_SESSAO_ADMIN_
// ORIGINAL) - "voltarParaAdmin" usa isso pra restaurar a sessão sem pedir
// senha de novo. Chamada automaticamente ao logar como admin (ver
// app/admin/entrar/page.jsx e o redirect de app/login/actions.js) - entrar
// direto no /dashboard como advogado é o padrão agora; /admin fica atrás
// do botão "Painel do administrador" em Configurações.
export async function entrarComoAdvogado() {
  // Se cair aqui com "Acesso restrito", olha o log de
  // "[usuarioAdminDaRequisicao] negado" no terminal (dev) ou nos logs da
  // function (Vercel) - mostra se foi sessão não reconhecida ou e-mail
  // fora da allowlist.
  const admin = await usuarioAdminDaRequisicao();
  if (!admin) return { erro: "Acesso restrito ao administrador." };

  const supabaseAdmin = criarClienteSupabaseAdmin();
  if (!supabaseAdmin) return { erro: "Não configurado neste ambiente (falta SUPABASE_SERVICE_ROLE_KEY)." };

  const { data: escritorioDemo } = await supabaseAdmin.from("escritorios").select("id").eq("is_demo", true).maybeSingle();
  if (!escritorioDemo) {
    return { erro: "Escritório de demonstração ainda não existe (rode scripts/seed-demo.js)." };
  }

  // Guarda a sessão de admin ANTES de trocar - senão "voltarParaAdmin"
  // não tem pra onde voltar. Se por algum motivo não tiver sessão/token
  // aqui (não deveria acontecer, usuarioAdminDaRequisicao já confirmou
  // login), segue sem guardar - "voltarParaAdmin" só vai pedir pra
  // sair e entrar de novo, mesmo comportamento de antes.
  const supabaseAtual = criarClienteSupabaseServidor();
  const {
    data: { session: sessaoAdmin },
  } = await supabaseAtual.auth.getSession();
  if (sessaoAdmin) {
    cookies().set(
      COOKIE_SESSAO_ADMIN_ORIGINAL,
      JSON.stringify({ access_token: sessaoAdmin.access_token, refresh_token: sessaoAdmin.refresh_token }),
      { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 }
    );
  }

  const senha = gerarSenhaTemporaria();
  let advogadoId;

  const { data: advogadoExistente } = await supabaseAdmin.from("advogados").select("id").eq("email", EMAIL_PREVIEW_ADVOGADO).maybeSingle();

  if (advogadoExistente) {
    advogadoId = advogadoExistente.id;
    await supabaseAdmin.auth.admin.updateUserById(advogadoId, { password: senha });
  } else {
    const { data: usuarioCriado, error: erroUsuario } = await supabaseAdmin.auth.admin.createUser({
      email: EMAIL_PREVIEW_ADVOGADO,
      password: senha,
      email_confirm: true,
    });
    if (erroUsuario) return { erro: "Não foi possível preparar a conta de visualização." };
    advogadoId = usuarioCriado.user.id;

    const { error: erroAdvogado } = await supabaseAdmin.from("advogados").insert({
      id: advogadoId,
      escritorio_id: escritorioDemo.id,
      nome: "Visualização (Admin)",
      email: EMAIL_PREVIEW_ADVOGADO,
      precisa_trocar_senha: false,
      tour_visto: true, // não faz sentido mostrar o tour de 1º login pro admin
      permissoes: null, // vê tudo, igual acesso demo padrão
    });
    if (erroAdvogado) {
      await supabaseAdmin.auth.admin.deleteUser(advogadoId);
      return { erro: "Não foi possível preparar a conta de visualização." };
    }
  }

  const { error: erroLogin } = await supabaseAtual.auth.signInWithPassword({ email: EMAIL_PREVIEW_ADVOGADO, password: senha });
  if (erroLogin) return { erro: "Não foi possível entrar na visualização." };

  redirect("/dashboard");
}

// Botão "Painel do administrador" em Configurações (só aparece pra quem
// está logado como a conta de visualização - ver souPreviewAdmin). Restaura
// a sessão de admin guardada em COOKIE_SESSAO_ADMIN_ORIGINAL por
// entrarComoAdvogado, sem pedir senha de novo. Se o cookie não existir ou
// tiver expirado (ex.: sessão de visualização aberta há mais de 8h), pede
// pra sair e entrar de novo com o login de admin - mesmo aviso que existia
// antes de "voltar" existir.
export async function voltarParaAdmin() {
  const cookieStore = cookies();
  const bruto = cookieStore.get(COOKIE_SESSAO_ADMIN_ORIGINAL)?.value;
  if (!bruto) return { erro: "Sessão de admin expirou. Saia e entre de novo com seu login de admin." };

  let sessaoSalva;
  try {
    sessaoSalva = JSON.parse(bruto);
  } catch {
    return { erro: "Sessão de admin inválida. Saia e entre de novo com seu login de admin." };
  }

  const supabase = criarClienteSupabaseServidor();
  const { error } = await supabase.auth.setSession({
    access_token: sessaoSalva.access_token,
    refresh_token: sessaoSalva.refresh_token,
  });
  if (error) return { erro: "Não foi possível voltar - sessão expirou. Saia e entre de novo com seu login de admin." };

  cookieStore.delete(COOKIE_SESSAO_ADMIN_ORIGINAL);
  redirect("/admin");
}
