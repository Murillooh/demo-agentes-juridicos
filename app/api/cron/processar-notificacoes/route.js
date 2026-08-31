import { NextResponse } from "next/server";
import { criarClienteSupabaseAdmin } from "../../../../lib/supabase/admin";
import { processarFilaPendente } from "../../../../lib/notificacoes/processar";

export const maxDuration = 120;

// Rede de segurança da fila de notificações - o envio principal já acontece
// na hora (enfileirarNotificacao), esse cron só reprocessa o que falhou na
// 1ª tentativa (provedor fora do ar etc). Mesmo padrão fail-closed do
// /api/cron/verificar-diario: sem CRON_SECRET, rota desligada (503).
//
// Observação sobre cadência: no plano Hobby da Vercel, cron dispara no
// máximo 1x/dia mesmo com schedule mais frequente em vercel.json (Pro
// libera intervalo real de minutos). Como esse cron é só rede de segurança
// (a notificação já foi tentada na hora do evento), 1x/dia ainda cobre o
// caso de falha - só atrasa o retry de itens que já falharam, não atrasa o
// envio principal.
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
