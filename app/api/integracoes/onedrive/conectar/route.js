import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../../../lib/supabase/server";
import { montarUrlAutorizacao } from "../../../../../lib/onedrive/graph";

// Middleware não roda em /api (matcher exclui de propósito - ver
// middleware.js) - essa rota confere sessão sozinha, mesmo padrão de
// /api/peticoes/[id]/pdf e das rotas de cron.
export async function GET(request) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET || !process.env.MICROSOFT_REDIRECT_URI) {
    return NextResponse.json({ erro: "Integração com OneDrive não configurada neste ambiente." }, { status: 503 });
  }

  const state = randomBytes(24).toString("hex");
  const resposta = NextResponse.redirect(montarUrlAutorizacao(state));
  // httpOnly + curto (só serve pra validar o callback) - proteção CSRF do
  // fluxo OAuth (state precisa bater com o que a Microsoft manda de volta).
  resposta.cookies.set("ms_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  return resposta;
}
