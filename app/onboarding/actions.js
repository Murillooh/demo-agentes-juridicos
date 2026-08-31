"use server";

import { criarClienteSupabaseAdmin } from "../../lib/supabase/admin";
import { gerarSenhaTemporaria } from "../../lib/senha-temporaria";

// Cria Escritório + 1º Advogado (com senha temporária, obrigado a trocar no
// 1º login) + as OABs dele. Roda com a service role key (ignora RLS) porque
// ainda não existe sessão/advogado nenhum nesse momento - é o único ponto
// do sistema com esse privilégio, de propósito.
export async function criarEscritorio({ nomeEscritorio, nomeAdvogado, email, oabs }) {
  const nome = String(nomeEscritorio || "").trim();
  const nomeAdv = String(nomeAdvogado || "").trim();
  const emailLimpo = String(email || "")
    .trim()
    .toLowerCase();
  const listaOabs = Array.isArray(oabs) ? oabs.filter((o) => o.numero?.trim() && o.estadoUf?.trim()) : [];

  if (!nome) return { erro: "Informe o nome do escritório." };
  if (!nomeAdv) return { erro: "Informe o nome do advogado." };
  if (!emailLimpo || !emailLimpo.includes("@")) return { erro: "Informe um e-mail válido." };
  if (listaOabs.length === 0) return { erro: "Informe pelo menos uma OAB (número + estado)." };

  const numerosEstados = listaOabs.map((o) => o.estadoUf.trim().toUpperCase());
  if (new Set(numerosEstados).size !== numerosEstados.length) {
    return { erro: "Não repita o mesmo estado em duas OABs." };
  }

  const supabaseAdmin = criarClienteSupabaseAdmin();
  if (!supabaseAdmin) {
    return { erro: "Provisionamento não configurado neste ambiente (falta SUPABASE_SERVICE_ROLE_KEY)." };
  }

  const senhaTemporaria = gerarSenhaTemporaria();

  const { data: usuarioCriado, error: erroUsuario } = await supabaseAdmin.auth.admin.createUser({
    email: emailLimpo,
    password: senhaTemporaria,
    email_confirm: true,
  });
  if (erroUsuario) {
    const mensagem = erroUsuario.message?.includes("already been registered")
      ? "Já existe uma conta com esse e-mail."
      : "Não foi possível criar o acesso. Tente novamente.";
    return { erro: mensagem };
  }
  const advogadoId = usuarioCriado.user.id;

  const { data: escritorio, error: erroEscritorio } = await supabaseAdmin
    .from("escritorios")
    .insert({ nome })
    .select()
    .single();
  if (erroEscritorio) {
    await supabaseAdmin.auth.admin.deleteUser(advogadoId);
    return { erro: "Não foi possível criar o escritório. Tente novamente." };
  }

  const { error: erroAdvogado } = await supabaseAdmin.from("advogados").insert({
    id: advogadoId,
    escritorio_id: escritorio.id,
    nome: nomeAdv,
    email: emailLimpo,
    precisa_trocar_senha: true,
  });
  if (erroAdvogado) {
    await supabaseAdmin.auth.admin.deleteUser(advogadoId);
    await supabaseAdmin.from("escritorios").delete().eq("id", escritorio.id);
    return { erro: "Não foi possível cadastrar o advogado. Tente novamente." };
  }

  const linhasOab = listaOabs.map((o, i) => ({
    advogado_id: advogadoId,
    numero: o.numero.trim(),
    estado_uf: o.estadoUf.trim().toUpperCase(),
    principal: i === 0,
  }));
  const { error: erroOab } = await supabaseAdmin.from("oabs").insert(linhasOab);
  if (erroOab) {
    // Usuário/escritório/advogado já existem - não desfaz tudo por causa da
    // OAB, só avisa. Editar OAB depois de criado é feature de outra etapa.
    return {
      sucesso: true,
      avisoOab: "Escritório criado, mas as OABs não foram salvas. Ajuste isso assim que a tela de perfil existir.",
      email: emailLimpo,
      senhaTemporaria,
    };
  }

  return { sucesso: true, email: emailLimpo, senhaTemporaria };
}
