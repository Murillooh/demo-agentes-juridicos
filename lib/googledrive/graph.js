import "server-only";

const AUTORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const DRIVE_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3/files";

// drive.file (não "drive" completo) - só dá acesso a arquivos/pastas que
// ESTE app criar, nunca ao Google Drive inteiro da conta conectada. Como
// aqui só se cria PDF de petição (nunca lê arquivo que já existia antes),
// é o escopo mínimo necessário - deliberado, não esquecimento.
const ESCOPOS = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";

export function montarUrlAutorizacao(state) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: ESCOPOS,
    access_type: "offline",
    // Sem isso o Google só manda refresh_token na 1ª autorização de todas -
    // reconectar depois de já ter autorizado uma vez viria sem refresh_token
    // nenhum, e a conexão morreria em ~1h sem aviso.
    prompt: "consent",
    state,
  });
  return `${AUTORIZE_URL}?${params.toString()}`;
}

async function chamarJson(url, opcoes = {}) {
  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), opcoes.timeoutMs || 15000);
  try {
    const resposta = await fetch(url, { ...opcoes, signal: controlador.signal });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      return { sucesso: false, erro: dados.error_description || dados.error?.message || `Google respondeu ${resposta.status}` };
    }
    return { sucesso: true, dados };
  } catch (err) {
    return { sucesso: false, erro: err.name === "AbortError" ? "timeout" : "falha de conexão" };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function trocarCodigoPorToken(code) {
  return chamarJson(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    }).toString(),
  });
}

export async function renovarToken(refreshToken) {
  return chamarJson(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });
}

export async function buscarPerfilGoogle(accessToken) {
  const resultado = await chamarJson(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` }, timeoutMs: 8000 });
  return resultado.sucesso ? resultado.dados.email || null : null;
}

// Access token dura ~1h - qualquer envio pro Google Drive passa por aqui
// antes. Se o refresh falhar (token revogado pelo usuário em
// myaccount.google.com/permissions, por exemplo), marca a integração como
// 'expirada' e devolve null - quem chama trata como "não conectado", nunca
// deixa exceção subir (token expirado/revogado não pode quebrar o resto do
// sistema).
export async function obterTokenValido(admin, escritorioId) {
  const { data: integracao } = await admin
    .from("integracoes_googledrive")
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
    await admin.from("integracoes_googledrive").update({ status: "expirada", ultimo_erro: resultado.erro }).eq("escritorio_id", escritorioId);
    return null;
  }

  const novoExpiraEm = new Date(Date.now() + resultado.dados.expires_in * 1000).toISOString();
  await admin
    .from("integracoes_googledrive")
    .update({
      access_token: resultado.dados.access_token,
      // Google normalmente NÃO manda refresh_token de novo no refresh
      // comum - mantém o antigo nesse caso em vez de gravar undefined.
      refresh_token: resultado.dados.refresh_token || integracao.refresh_token,
      expira_em: novoExpiraEm,
      status: "ativa",
    })
    .eq("escritorio_id", escritorioId);

  return resultado.dados.access_token;
}

function escaparNomeQuery(nome) {
  return String(nome).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// Diferente do OneDrive (endereça por path, cria pasta que falta sozinho),
// o Drive é baseado em ID - cada nível da árvore precisa ser resolvido à
// mão: procura uma pasta com esse nome dentro do pai; se não achar, cria.
// Funciona com o escopo drive.file porque a pasta, uma vez criada por este
// app, passa a ser "visível" pras buscas seguintes dele mesmo.
export async function obterOuCriarPasta({ accessToken, nome, paiId }) {
  const query = `name='${escaparNomeQuery(nome)}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${paiId}' in parents`;
  const busca = await chamarJson(`${DRIVE_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!busca.sucesso) throw new Error(busca.erro);
  if (busca.dados.files?.length) return busca.dados.files[0].id;

  const criacao = await chamarJson(`${DRIVE_BASE}/files?fields=id`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: nome, mimeType: "application/vnd.google-apps.folder", parents: [paiId] }),
  });
  if (!criacao.sucesso) throw new Error(criacao.erro);
  return criacao.dados.id;
}

// Upload multipart simples (metadata + bytes numa request só) - limite
// prático de uns 5MB antes de precisar de upload resumível. Petição
// jurídica em texto fica bem abaixo disso; arquivo maior precisaria de
// resumable upload, fora do escopo aqui (documentado, não fingido).
export async function criarArquivo({ accessToken, nome, paiId, bytes }) {
  const boundary = `peticao_${Date.now()}`;
  const metadata = JSON.stringify({ name: nome, parents: [paiId] });
  const corpo = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`),
    Buffer.from(bytes),
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const resultado = await chamarJson(`${UPLOAD_BASE}?uploadType=multipart&fields=id,webViewLink`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body: corpo,
    timeoutMs: 20000,
  });
  if (!resultado.sucesso) return resultado;
  return { sucesso: true, arquivoId: resultado.dados.id, webViewLink: resultado.dados.webViewLink };
}

// Reenviar (retry, ou "Analisar de novo" equivalente) atualiza o CONTEÚDO
// do arquivo já criado antes, em vez de criar um 2º arquivo com o mesmo
// nome - Drive permite nomes duplicados numa pasta (não é filesystem),
// então sem isso cada nova tentativa viraria uma cópia extra.
export async function atualizarArquivo({ accessToken, arquivoId, bytes }) {
  const resultado = await chamarJson(`${UPLOAD_BASE}/${arquivoId}?uploadType=media&fields=id,webViewLink`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/pdf" },
    body: bytes,
    timeoutMs: 20000,
  });
  if (!resultado.sucesso) return resultado;
  return { sucesso: true, arquivoId: resultado.dados.id, webViewLink: resultado.dados.webViewLink };
}
