import { NextResponse } from "next/server";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../../../lib/supabase/server";
import { gerarPdfPeticao } from "../../../../../lib/gerar-pdf-peticao";

export async function GET(request, { params }) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) {
    return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  }

  const { data: peticao } = await supabase
    .from("peticoes")
    .select("id, titulo, area_direito, conteudo, escritorio_id")
    .eq("id", params.id)
    .maybeSingle();
  // RLS já barra petição de outro escritório - null cobre "não existe" e
  // "não é meu" igual, sem diferenciar resposta.
  if (!peticao) {
    return NextResponse.json({ erro: "Petição não encontrada." }, { status: 404 });
  }

  const { data: escritorio } = await supabase
    .from("escritorios")
    .select("nome, logo_url")
    .eq("id", peticao.escritorio_id)
    .maybeSingle();

  const bytes = await gerarPdfPeticao({ peticao, escritorio });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="peticao-${peticao.id}.pdf"`,
    },
  });
}
