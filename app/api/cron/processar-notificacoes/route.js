import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import { processarFilaPendente } from "../../../../lib/notificacoes/processar";

export const maxDuration = 120;

// Rede de segurança da fila de notificações - o envio principal já acontece
// na hora (enfileirarNotificacao), esse cron só reprocessa o que falhou na
// 1ª tentativa (provedor fora do ar etc). Mesmo padrão fail-closed do
// /api/cron/verificar-diario: sem CRON_SECRET, rota desligada (503).
//
// Observação sobre cadência: schedule em vercel.json é 1x/dia de propósito
// - descoberto na prática que plano Hobby não "degrada" um cron mais
// frequente pra diário, ele REJEITA o deploy inteiro
// (cron_jobs_limits_reached), derrubando o site todo por causa de um cron
// que nem é o principal. Como esse cron é só rede de segurança (a
// notificação já foi tentada na hora do evento), 1x/dia cobre o caso de
// falha - só atrasa o retry de itens que já falharam, não atrasa o envio
// principal. Plano Pro libera intervalo real de minutos, se algum dia
// precisar.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ erro: "CRON_SECRET não configurada neste ambiente." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ erro: "Não configurado neste ambiente (falta SUPABASE_SERVICE_ROLE_KEY)." }, { status: 500 });
  }

  const resultado = await processarFilaPendente(admin);
  return NextResponse.json(resultado);
}
