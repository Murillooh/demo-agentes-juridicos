import { NextResponse } from "next/server";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../../../lib/supabase/admin";

// Bucket "contratos" é privado - essa rota é o único jeito de ver o
// arquivo original. Confere posse via RLS (client da sessão: maybeSingle
// só devolve linha se for do meu escritório) antes de pedir a URL
// assinada pro client admin - mesmo padrão de /api/peticoes/[id]/pdf.
export async function GET(request, { params }) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) {
    return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  }

  const { data: contrato } = await supabase
    .from("contratos")
    .select("caminho_armazenamento")
    .eq("id", params.id)
    .maybeSingle();
  if (!contrato) {
    return NextResponse.json({ erro: "Contrato não encontrado." }, { status: 404 });
  }

  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ erro: "Não configurado neste ambiente." }, { status: 500 });
  }

  const { data, error } = await admin.storage.from("contratos").createSignedUrl(contrato.caminho_armazenamento, 300);
  if (error || !data) {
    return NextResponse.json({ erro: "Não foi possível gerar o link do arquivo." }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
