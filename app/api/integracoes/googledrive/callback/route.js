import { NextResponse } from "next/server";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../../../lib/supabase/admin";
import { trocarCodigoPorToken, buscarPerfilGoogle } from "../../../../../lib/googledrive/graph";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const erroGoogle = url.searchParams.get("error");

  const destino = new URL("/integracoes", request.url);
  const stateCookie = request.cookies.get("google_oauth_state")?.value;

  // State é de uso único - limpa o cookie em qualquer desfecho.
  function redirecionar(alvo) {
    const resposta = NextResponse.redirect(alvo);
    resposta.cookies.delete("google_oauth_state");
    return resposta;
  }

  if (erroGoogle) {
    destino.searchParams.set("erro", "O acesso ao Google Drive foi negado ou cancelado.");
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
    // access_type=offline + prompt=consent (graph.js) deveriam garantir
    // isso sempre - mas se a Google mudar de ideia, recusa aqui com
    // mensagem clara em vez de salvar uma conexão que morre em 1h sem
    // aviso.
    destino.searchParams.set("erro", "O Google não concedeu acesso permanente. Tente conectar de novo.");
    return redirecionar(destino);
  }

  const email = await buscarPerfilGoogle(access_token);

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    destino.searchParams.set("erro", "Não configurado neste ambiente (falta SUPABASE_SERVICE_ROLE_KEY).");
    return redirecionar(destino);
  }

  const { error } = await admin.from("integracoes_googledrive").upsert(
    {
      escritorio_id: advogado.escritorio_id,
      access_token,
      refresh_token,
      expira_em: new Date(Date.now() + expires_in * 1000).toISOString(),
      email_conta_google: email,
      status: "ativa",
      ultimo_erro: null,
      // Reconectar não deve manter pasta cacheada de uma conta Google
      // DIFERENTE (o access_token novo pode ser de outra conta) - zera pra
      // resolver de novo no próximo envio.
      pasta_raiz_id: null,
      pasta_clientes_id: null,
    },
    { onConflict: "escritorio_id" }
  );
  if (error) {
    destino.searchParams.set("erro", "Conectado no Google, mas não foi possível salvar aqui. Tente de novo.");
    return redirecionar(destino);
  }

  destino.searchParams.set("conectado", "1");
  return redirecionar(destino);
}
