import "server-only";
import { enviarEmail } from "./enviar-email";
import { enviarWhatsapp } from "./enviar-whatsapp";

export const MAX_TENTATIVAS = 5;
const BACKOFF_BASE_MINUTOS = 5;
const BACKOFF_MAX_MINUTOS = 24 * 60;

// Backoff exponencial (5min, 10min, 20min, 40min, 80min...), capado em 24h -
// falha pontual do provedor tenta de novo rápido, falha persistente não fica
// martelando a API dele a cada poucos minutos pra sempre.
function calcularProximaTentativa(tentativas) {
  const minutos = Math.min(BACKOFF_BASE_MINUTOS * 2 ** tentativas, BACKOFF_MAX_MINUTOS);
  return new Date(Date.now() + minutos * 60 * 1000).toISOString();
}

// Processa 1 linha de "notificacoes": tenta enviar no canal dela, atualiza
// status conforme o resultado. Nunca lança - quem chama (enfileiramento
// síncrono ou o cron da fila) não pode quebrar por causa de 1 envio falho.
export async function processarNotificacao(admin, notificacao) {
  const resultado =
    notificacao.canal === "email"
      ? await enviarEmail({ to: notificacao.destino, subject: notificacao.titulo, texto: notificacao.mensagem })
      : await enviarWhatsapp({ to: notificacao.destino, texto: `${notificacao.titulo}\n\n${notificacao.mensagem}` });

  if (resultado.sucesso) {
    await admin
      .from("notificacoes")
      .update({ status: "enviada", enviada_em: new Date().toISOString(), erro_detalhe: null })
      .eq("id", notificacao.id);
    return true;
  }

  const tentativas = notificacao.tentativas + 1;
  const esgotou = tentativas >= MAX_TENTATIVAS;
  await admin
    .from("notificacoes")
    .update({
      tentativas,
      status: esgotou ? "falha" : "pendente",
      proxima_tentativa: esgotou ? notificacao.proxima_tentativa : calcularProximaTentativa(tentativas),
      erro_detalhe: resultado.erro || "Falha desconhecida",
    })
    .eq("id", notificacao.id);
  return false;
}

// Rede de segurança da fila: a tentativa principal já acontece na hora
// (enfileirarNotificacao chama processarNotificacao direto), isso aqui só
// repesca o que falhou e ainda não esgotou tentativas. Chamado pelo cron
// /api/cron/processar-notificacoes.
export async function processarFilaPendente(admin, limite = 50) {
  const { data: pendentes, error } = await admin
    .from("notificacoes")
    .select("*")
    .eq("status", "pendente")
    .lte("proxima_tentativa", new Date().toISOString())
    .order("proxima_tentativa", { ascending: true })
    .limit(limite);
  if (error) return { erro: "Não foi possível carregar a fila.", processadas: 0 };

  let sucesso = 0;
  let falha = 0;
  for (const notificacao of pendentes || []) {
    const ok = await processarNotificacao(admin, notificacao);
    if (ok) sucesso++;
    else falha++;
  }
  return { processadas: (pendentes || []).length, sucesso, falha };
}
