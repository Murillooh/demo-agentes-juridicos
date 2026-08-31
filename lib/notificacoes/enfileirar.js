import "server-only";
import { processarNotificacao } from "./processar";

// Cria a(s) linha(s) de notificação pro evento (prazo novo / atualização do
// Diário) nos canais que o escritório tem ativado, e já tenta enviar na
// hora - é isso que cumpre o critério de aceite "gera notificação dentro de
// um tempo razoável" sem depender só do cron (o cron é só rede de
// segurança pra quando o envio síncrono falha).
//
// upsert com ignoreDuplicates é a proteção contra duplicado: mesmo
// evento+canal nunca gera 2 linhas (unique(tipo_evento, evento_id, canal) -
// mesma ideia da unique de atualizacoes_diario na Etapa 4).
//
// Precisa do client admin (service role) - "notificacoes" não tem policy de
// INSERT pra sessão comum, só o servidor enfileira. Nunca lança - quem
// chama (prazos/actions.js, lib/verificar-diario.js) envolve em try/catch
// mesmo assim, notificação nunca pode quebrar o fluxo que a originou.
export async function enfileirarNotificacao({ admin, escritorioId, advogadoId, tipoEvento, eventoId, titulo, mensagem }) {
  if (!admin || !advogadoId) return;

  const { data: config } = await admin
    .from("configuracoes_notificacao")
    .select("canal_email, canal_whatsapp")
    .eq("escritorio_id", escritorioId)
    .maybeSingle();
  // Sem config cadastrada ainda -> default seguro: só e-mail (todo advogado
  // já tem via login; WhatsApp exige número que pode nunca ter sido
  // preenchido).
  const canalEmail = config ? config.canal_email : true;
  const canalWhatsapp = config ? config.canal_whatsapp : false;

  const { data: advogado } = await admin
    .from("advogados")
    .select("email, telefone_whatsapp")
    .eq("id", advogadoId)
    .maybeSingle();
  if (!advogado) return;

  const linhas = [];
  if (canalEmail && advogado.email) {
    linhas.push({
      escritorio_id: escritorioId,
      advogado_id: advogadoId,
      tipo_evento: tipoEvento,
      evento_id: eventoId,
      canal: "email",
      destino: advogado.email,
      titulo,
      mensagem,
    });
  }
  if (canalWhatsapp && advogado.telefone_whatsapp) {
    linhas.push({
      escritorio_id: escritorioId,
      advogado_id: advogadoId,
      tipo_evento: tipoEvento,
      evento_id: eventoId,
      canal: "whatsapp",
      destino: advogado.telefone_whatsapp,
      titulo,
      mensagem,
    });
  }
  // Canal desligado, ou ligado mas sem destino cadastrado (ex.: WhatsApp
  // ativo porém advogado nunca preencheu o número) - nada pra enfileirar.
  if (linhas.length === 0) return;

  const { data: criadas, error } = await admin
    .from("notificacoes")
    .upsert(linhas, { onConflict: "tipo_evento,evento_id,canal", ignoreDuplicates: true })
    .select("*");
  if (error || !criadas) return;

  for (const notificacao of criadas) {
    await processarNotificacao(admin, notificacao);
  }
}
