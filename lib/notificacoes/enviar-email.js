import "server-only";

// E-mail transacional via Resend, chamado direto por REST (sem SDK "resend"
// - 1 POST só não justifica dependência a mais, mesmo raciocínio já usado
// pro DJEN). Escolhido por: API mínima, sandbox sem domínio verificado
// (remetente onboarding@resend.dev entrega pro e-mail dono da conta - serve
// pra dev/teste), preço competitivo com domínio verificado em produção.
const API_URL = "https://api.resend.com/emails";

// Nunca lança - falha de e-mail vira { sucesso: false, erro } pro chamador
// (lib/notificacoes/processar.js) decidir status/retry, nunca derruba o
// fluxo que gerou o evento (criar prazo, job do Diário).
export async function enviarEmail({ to, subject, texto }) {
  const apiKey = process.env.RESEND_API_KEY;
  const remetente = process.env.RESEND_FROM;
  if (!apiKey || !remetente) {
    return { sucesso: false, erro: "E-mail não configurado neste ambiente (falta RESEND_API_KEY/RESEND_FROM)." };
  }

  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), 10000);

  try {
    const resposta = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remetente,
        to: [to],
        subject,
        html: `<div style="font-family:sans-serif;line-height:1.6;color:#1a1a1a;font-size:14px">${texto
          .split("\n")
          .map((linha) => `<p style="margin:0 0 10px">${linha}</p>`)
          .join("")}</div>`,
      }),
      signal: controlador.signal,
    });
    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => "");
      return { sucesso: false, erro: `Resend respondeu ${resposta.status}: ${corpo.slice(0, 200)}` };
    }
    return { sucesso: true };
  } catch (err) {
    return { sucesso: false, erro: err.name === "AbortError" ? "timeout" : "falha de conexão" };
  } finally {
    clearTimeout(timeoutId);
  }
}
