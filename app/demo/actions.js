"use server";

import { criarClienteSupabaseAdmin } from "../../lib/supabase/admin";
import { gerarSenhaTemporaria } from "../../lib/senha-temporaria";
import { enviarEmail } from "../../lib/notificacoes/enviar-email";

// Diferente de /onboarding (cria um escritório NOVO do zero, com OABs
// etc.) - aqui o e-mail entra como advogado a mais no ÚNICO escritório
// marcado is_demo=true (migration 009), um "sandbox" compartilhado já
// populado com petições/prazos/contratos de exemplo. É o que faz sentido
// pra alguém testar o sistema já vendo dado real, não uma tela vazia.
export async function criarAcessoDemo(_estadoAnterior, formData) {
  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!nome) return { erro: "Informe seu nome." };
  if (!email || !email.includes("@")) return { erro: "Informe um e-mail válido." };

  const admin = criarClienteSupabaseAdmin();
  if (!admin) return { erro: "Ambiente de demo não configurado (falta SUPABASE_SERVICE_ROLE_KEY)." };

  const { data: escritorioDemo, error: erroEscritorio } = await admin
    .from("escritorios")
    .select("id")
    .eq("is_demo", true)
    .maybeSingle();
  if (erroEscritorio || !escritorioDemo) {
    return { erro: "Ambiente de demo ainda não está pronto. Tente novamente mais tarde." };
  }

  const senhaTemporaria = gerarSenhaTemporaria();

  const { data: usuarioCriado, error: erroUsuario } = await admin.auth.admin.createUser({
    email,
    password: senhaTemporaria,
    email_confirm: true,
  });
  if (erroUsuario) {
    const mensagem = erroUsuario.message?.includes("already been registered")
      ? "Já existe um acesso com esse e-mail. Veja sua caixa de entrada (inclusive spam) pelo e-mail de boas-vindas anterior."
      : "Não foi possível criar o acesso. Tente novamente.";
    return { erro: mensagem };
  }

  const { error: erroAdvogado } = await admin.from("advogados").insert({
    id: usuarioCriado.user.id,
    escritorio_id: escritorioDemo.id,
    nome,
    email,
    precisa_trocar_senha: true,
  });
  if (erroAdvogado) {
    await admin.auth.admin.deleteUser(usuarioCriado.user.id);
    return { erro: "Não foi possível criar o acesso. Tente novamente." };
  }

  const urlBase = process.env.NEXT_PUBLIC_APP_URL || "";
  const resultadoEmail = await enviarEmail({
    to: email,
    subject: "Seu acesso demo à Plataforma Jurídica",
    texto: `Olá, ${nome}!

Seu acesso de demonstração está pronto. Você vai encontrar um escritório já com petições, prazos, contratos analisados e atualizações de exemplo - dá pra explorar o sistema inteiro sem começar do zero.

Login: ${urlBase}/
E-mail: ${email}
Senha temporária: ${senhaTemporaria}

No primeiro acesso o sistema pede pra você trocar essa senha por uma sua.

O que vale explorar:
- Board: acompanhe petições passando por Criação, Revisão e Protocolo
- Petições: gere uma minuta nova com IA a partir do estilo do escritório
- Prazos e Agenda: cole um despacho e veja a IA identificar o prazo
- Contratos: envie um PDF/DOCX e veja a leitura estruturada por IA
- Diário Oficial e Notificações: acompanhamento automático por OAB

Qualquer dúvida, é só responder este e-mail.`,
  });

  // E-mail é best-effort - se falhar (provedor fora do ar, sem crédito
  // etc), o acesso já existe de qualquer jeito. Devolve a senha na tela
  // pra quem está testando não ficar sem jeito de entrar.
  return {
    sucesso: true,
    email,
    senhaTemporaria,
    avisoEmail: resultadoEmail.sucesso ? null : "Acesso criado, mas não foi possível enviar o e-mail de boas-vindas. Guarde a senha abaixo.",
  };
}
