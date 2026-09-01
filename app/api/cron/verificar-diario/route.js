import { NextResponse } from "next/server";
import { executarVerificacaoDiario } from "../../../../lib/verificar-diario";
import { executarVerificacaoProcessos } from "../../../../lib/verificar-processos";

export const maxDuration = 300;

// Sem CRON_SECRET configurada, a rota fica desligada (503) em vez de
// aberta pra qualquer um na internet disparar o job - mesmo raciocínio do
// resto do projeto (degrada, mas nunca degrada pra "inseguro por padrão").
//
// Etapa 10 - verificação de processos acompanhados (DataJud) roda dentro
// desse MESMO cron, não um separado: Vercel Hobby rejeita o deploy inteiro
// se o total de crons/schedule passar do limite do plano (já bateu nisso
// nesse projeto - vercel.json só tem 2 entradas de propósito). Diário e
// processos não têm nada a ver um com o outro, mas dividir o mesmo horário
// é o custo aceito pra não arriscar quebrar o deploy de novo.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ erro: "CRON_SECRET não configurada neste ambiente." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const diario = await executarVerificacaoDiario();
  const processos = await executarVerificacaoProcessos();

  return NextResponse.json({ diario, processos });
}
