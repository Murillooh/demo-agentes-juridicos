import "server-only";

// WhatsApp via Twilio, chamado direto por REST (sem o SDK "twilio" - mesmo
// raciocínio do enviar-email.js). Escolhido em vez de Zenvia (alternativa
// BR-only) por: sandbox de teste sem aprovação prévia do WhatsApp Business
// (número de sandbox + "join <código>" no WhatsApp do destinatário -
// funciona pra dev/demo sem processo de verificação), documentação estável,
// e não fica preso a um provedor BR-only se o escritório operar fora do
// Brasil. Zenvia é alternativa viável se o volume for 100% BR e o custo por
// mensagem pesar mais que a portabilidade.
const BASE_URL = "https://api.twilio.com/2010-04-01/Accounts";

// Nunca lança - mesmo contrato de enviarEmail (ver ali).
export async function enviarWhatsapp({ to, texto }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const de = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !de) {
    return {
      sucesso: false,
      erro: "WhatsApp não configurado neste ambiente (falta TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM).",
    };
  }

  const credenciais = Buffer.from(`${sid}:${token}`).toString("base64");
  const corpo = new URLSearchParams({
    From: de.startsWith("whatsapp:") ? de : `whatsapp:${de}`,
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    Body: texto,
  });

  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), 10000);

  try {
    const resposta = await fetch(`${BASE_URL}/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credenciais}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: corpo.toString(),
      signal: controlador.signal,
    });
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      return { sucesso: false, erro: `Twilio respondeu ${resposta.status}: ${dados.message || "erro desconhecido"}` };
    }
    return { sucesso: true };
  } catch (err) {
    return { sucesso: false, erro: err.name === "AbortError" ? "timeout" : "falha de conexão" };
  } finally {
    clearTimeout(timeoutId);
  }
}
