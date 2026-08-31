import { NextResponse } from "next/server";
import { executarVerificacaoDiario } from "../../../../lib/verificar-diario";

export const maxDuration = 300;

// Sem CRON_SECRET configurada, a rota fica desligada (503) em vez de
// aberta pra qualquer um na internet disparar o job - mesmo raciocínio do
// resto do projeto (degrada, mas nunca degrada pra "inseguro por padrão").
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ erro: "CRON_SECRET não configurada neste ambiente." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const resultado = await executarVerificacaoDiario();
  if (resultado.erro) {
    return NextResponse.json(resultado, { status: 500 });
  }
  return NextResponse.json(resultado);
}
