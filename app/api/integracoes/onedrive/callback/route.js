import { NextResponse } from "next/server";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../../../lib/supabase/admin";
import { trocarCodigoPorToken, buscarPerfilMicrosoft } from "../../../../../lib/onedrive/graph";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const erroMicrosoft = url.searchParams.get("error_description") || url.searchParams.get("error");

  const destino = new URL("/integracoes", request.url);
  const stateCookie = request.cookies.get("ms_oauth_state")?.value;

  // State é de uso único - limpa o cookie em qualquer desfecho (sucesso,
  // erro da Microsoft, ou state inválido).
  function redirecionar(alvo) {
    const resposta = NextResponse.redirect(alvo);
    resposta.cookies.delete("ms_oauth_state");
    return resposta;
  }

  if (erroMicrosoft) {
    destino.searchParams.set("erro", "O acesso ao OneDrive foi negado ou cancelado.");
    return redirecionar(destino);
  }

  if (!code || !state || !stateCookie || state !== stateCookie) {
    destino.searchParams.set("erro", "Não foi possível confirmar a conexão (sessão do OAuth expirada). Tente de novo.");
    return redirecionar(destino);
  }

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) {
    return redirecionar(new URL("/", request.url));
  }

  const { data: advogado } = await supabase.from("advogados").select("escritorio_id").eq("id", user.id).maybeSingle();
  if (!advogado) {
    destino.searchParams.set("erro", "Perfil não encontrado.");
    return redirecionar(destino);
  }

  const resultado = await trocarCodigoPorToken(code);
  if (!resultado.sucesso) {
    destino.searchParams.set("erro", `Falha ao conectar: ${resultado.erro}`);
    return redirecionar(destino);
  }

  const { access_token, refresh_token, expires_in } = resultado.dados;
  if (!refresh_token) {
    // Sem offline_access concedido (consentimento parcial) a conexão
    // morreria em ~1h sem aviso claro. Recusa aqui com mensagem explícita
    // em vez de salvar uma conexão meio-funcional que falha silenciosamente
    // depois.
    destino.searchParams.set(
      "erro",
      "A Microsoft não concedeu acesso permanente (offline_access). Tente conectar de novo e aceite todas as permissões pedidas."
    );
    return redirecionar(destino);
  }

  const email = await buscarPerfilMicrosoft(access_token);

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    destino.searchParams.set("erro", "Não configurado neste ambiente (falta SUPABASE_SERVICE_ROLE_KEY).");
    return redirecionar(destino);
  }

  const { error } = await admin.from("integracoes_onedrive").upsert(
    {
      escritorio_id: advogado.escritorio_id,
      access_token,
      refresh_token,
      expira_em: new Date(Date.now() + expires_in * 1000).toISOString(),
      email_conta_ms: email,
      status: "ativa",
      ultimo_erro: null,
    },
    { onConflict: "escritorio_id" }
  );
  if (error) {
    destino.searchParams.set("erro", "Conectado na Microsoft, mas não foi possível salvar aqui. Tente de novo.");
    return redirecionar(destino);
  }

  destino.searchParams.set("conectado", "1");
  return redirecionar(destino);
}
