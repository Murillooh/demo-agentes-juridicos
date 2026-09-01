import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { souAdmin } from "./lib/admin";
import { telaPermitida, primeiraTelaPermitida } from "./lib/permissoes";

const ROTAS_PUBLICAS = ["/", "/onboarding", "/demo"];

// Renova a sessão do Supabase a cada request e decide o roteamento:
//   sem sessão + rota protegida         -> "/"
//   com sessão + admin (Etapa 10)       -> "/admin" em vez de "/dashboard"
//   com sessão + precisa trocar senha   -> "/trocar-senha" (única rota liberada)
//   com sessão + "/" ou "/onboarding"   -> "/dashboard"
//   com sessão + tela sem permissão     -> primeira tela liberada (Etapa 10)
//
// Timeout em toda chamada ao Supabase por design - um engasgo aqui, sem
// isso, trava a página inteira até a Vercel matar a função (aconteceu de
// verdade no demo-agentes-juridicos: ver commit "fix: site inteiro travava
// carregando"). Na dúvida, deixa passar - cada layout/rota faz a própria
// checagem de qualquer jeito (defesa em profundidade).
async function comTimeout(promessa, ms = 5000) {
  return Promise.race([promessa, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

export async function middleware(request) {
  let resposta = NextResponse.next({ request });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return resposta;
  }

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar) {
        cookiesParaGravar.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookiesParaGravar.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  const { pathname } = request.nextUrl;
  const rotaPublica = ROTAS_PUBLICAS.includes(pathname);

  let user = null;
  try {
    const {
      data: { user: usuarioObtido },
    } = await comTimeout(supabase.auth.getUser());
    user = usuarioObtido;
  } catch {
    return resposta;
  }

  // "/trocar-senha" também exige sessão - só o redirect-loop (mais abaixo)
  // é que não se aplica quando o usuário já está nela.
  if (!rotaPublica && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  const ehAdmin = souAdmin(user?.email);

  if (rotaPublica && user) {
    const url = request.nextUrl.clone();
    // Admin não tem linha em "advogados" (não é dono de escritório) -
    // /dashboard quebraria pra ele. Vai direto pro painel.
    url.pathname = ehAdmin ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // Admin não passa pelas checagens de advogado (senha temporária,
  // permissão por tela) - elas não fazem sentido pra quem não é dono de
  // escritório nenhum.
  if (user && !ehAdmin && pathname !== "/trocar-senha") {
    try {
      const { data: advogado } = await comTimeout(
        supabase.from("advogados").select("precisa_trocar_senha, permissoes").eq("id", user.id).maybeSingle()
      );
      if (advogado?.precisa_trocar_senha) {
        const url = request.nextUrl.clone();
        url.pathname = "/trocar-senha";
        return NextResponse.redirect(url);
      }
      if (advogado && !telaPermitida(pathname, advogado.permissoes)) {
        const url = request.nextUrl.clone();
        url.pathname = primeiraTelaPermitida(advogado.permissoes);
        return NextResponse.redirect(url);
      }
    } catch {
      // Engasgou a consulta - deixa passar em vez de travar; a própria
      // página de destino também confere isso (defesa em profundidade).
    }
  }

  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
