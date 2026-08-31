import "server-only";

// Endpoint "common" (multi-tenant) - aceita tanto conta pessoal da
// Microsoft quanto conta corporativa/escolar (Azure AD), sem restringir a
// um tenant fixo. Cada escritório conecta a própria conta - é exatamente
// pra isso que serve.
const AUTORIZE_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

// offline_access -> refresh_token (sem ele a conexão morre em ~1h sem
// aviso). Files.ReadWrite -> escreve no OneDrive da própria conta
// conectada (não precisa de admin consent, diferente de Files.ReadWrite.All).
// User.Read -> só pra mostrar o e-mail da conta conectada na tela de status.
const ESCOPOS = "offline_access Files.ReadWrite User.Read";

export function montarUrlAutorizacao(state) {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
    response_mode: "query",
    scope: ESCOPOS,
    state,
  });
  return `${AUTORIZE_URL}?${params.toString()}`;
}

async function chamarTokenEndpoint(corpo) {
  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), 10000);
  try {
    const resposta = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo.toString(),
      signal: controlador.signal,
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      return { sucesso: false, erro: dados.error_description || `Microsoft respondeu ${resposta.status}` };
    }
    return { sucesso: true, dados };
  } catch (err) {
    return { sucesso: false, erro: err.name === "AbortError" ? "timeout" : "falha de conexão" };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function trocarCodigoPorToken(code) {
  return chamarTokenEndpoint(
    new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
      scope: ESCOPOS,
    })
  );
}

export async function renovarToken(refreshToken) {
  return chamarTokenEndpoint(
    new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: ESCOPOS,
    })
  );
}

export async function buscarPerfilMicrosoft(accessToken) {
  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), 8000);
  try {
    const resposta = await fetch(`${GRAPH_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controlador.signal,
    });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    return dados.mail || dados.userPrincipalName || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Access token dura ~1h - qualquer envio pro OneDrive passa por aqui antes.
// Se o refresh falhar (token revogado pelo usuário nas configurações da
// conta Microsoft, por exemplo), marca a integração como 'expirada' e
// devolve null - quem chama trata isso como "não conectado", nunca deixa
// exceção subir (requisito explícito da Etapa 7: token expirado/revogado
// não pode quebrar o resto do sistema).
export async function obterTokenValido(admin, escritorioId) {
  const { data: integracao } = await admin
    .from("integracoes_onedrive")
    .select("access_token, refresh_token, expira_em")
    .eq("escritorio_id", escritorioId)
    .maybeSingle();
  if (!integracao) return null;

  const expiraEm = new Date(integracao.expira_em).getTime();
  const margemMs = 2 * 60 * 1000;
  if (Date.now() < expiraEm - margemMs) {
    return integracao.access_token;
  }

  const resultado = await renovarToken(integracao.refresh_token);
  if (!resultado.sucesso) {
    await admin
      .from("integracoes_onedrive")
      .update({ status: "expirada", ultimo_erro: resultado.erro })
      .eq("escritorio_id", escritorioId);
    return null;
  }

  const novoExpiraEm = new Date(Date.now() + resultado.dados.expires_in * 1000).toISOString();
  await admin
    .from("integracoes_onedrive")
    .update({
      access_token: resultado.dados.access_token,
      // Microsoft às vezes não manda refresh_token novo no refresh - mantém
      // o antigo nesse caso em vez de gravar undefined por cima.
      refresh_token: resultado.dados.refresh_token || integracao.refresh_token,
      expira_em: novoExpiraEm,
      status: "ativa",
    })
    .eq("escritorio_id", escritorioId);

  return resultado.dados.access_token;
}

// Upload simples (path-based, cria as pastas intermediárias que faltarem
// automaticamente) - limite de 4MB do endpoint /content. Petição jurídica
// em texto (mesmo com logo embutido) fica bem abaixo disso; arquivo maior
// precisaria de createUploadSession, fora do escopo aqui - fica
// documentado como limitação real, não implementado como se funcionasse
// pra qualquer tamanho.
export async function enviarArquivoOneDrive({ accessToken, caminho, bytes }) {
  const caminhoCodificado = caminho.split("/").map(encodeURIComponent).join("/");
  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), 20000);
  try {
    const resposta = await fetch(
      `${GRAPH_BASE}/me/drive/root:/${caminhoCodificado}:/content?@microsoft.graph.conflictBehavior=replace`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/pdf" },
        body: bytes,
        signal: controlador.signal,
      }
    );
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      return { sucesso: false, erro: dados.error?.message || `Graph respondeu ${resposta.status}` };
    }
    return { sucesso: true, webUrl: dados.webUrl };
  } catch (err) {
    return { sucesso: false, erro: err.name === "AbortError" ? "timeout" : "falha de conexão" };
  } finally {
    clearTimeout(timeoutId);
  }
}
