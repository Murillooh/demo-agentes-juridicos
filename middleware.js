import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { souAdmin } from "./lib/admin";
import { telaPermitida, primeiraTelaPermitida } from "./lib/permissoes";

const ROTAS_PUBLICAS = ["/", "/onboarding", "/demo"];

// Renova a sessão do Supabase a cada request e decide o roteamento:
//   sem sessão + rota protegida         -> "/"
//   com sessão + admin                  -> "/admin/entrar" (vira advogado de visualização, cai no /dashboard - "/admin" de verdade fica atrás do botão em Configurações)
//   com sessão + não aprovado           -> "/aguardando-aprovacao" (cadastro público via /onboarding)
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
    // Admin entra direto como a conta de visualização (mesma troca de "Ver
    // como advogado", automática) - /admin/entrar faz a troca e manda pro
    // /dashboard. Painel de verdade fica atrás do botão em Configurações.
    url.pathname = ehAdmin ? "/admin/entrar" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // Admin não passa pelas checagens de advogado (senha temporária,
  // aprovação, permissão por tela) - elas não fazem sentido pra quem não é
  // dono de escritório nenhum.
  if (user && !ehAdmin && pathname !== "/trocar-senha" && pathname !== "/aguardando-aprovacao") {
    try {
      const { data: advogado } = await comTimeout(
        supabase.from("advogados").select("precisa_trocar_senha, permissoes, aprovado").eq("id", user.id).maybeSingle()
      );
      // Aprovação vem antes de tudo - cadastro público (/onboarding) nasce
      // aprovado=false, nem troca de senha nem tela nenhuma libera até o
      // admin aprovar em /admin.
      if (advogado && !advogado.aprovado) {
        const url = request.nextUrl.clone();
        url.pathname = "/aguardando-aprovacao";
        return NextResponse.redirect(url);
      }
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
  // Exclui também arquivos estáticos de public/ (ex: mockup.jpg da landing)
  // - sem isso, um <img src="/mockup.jpg"> sem sessão caía no redirect pra
  // "/" (rota protegida por padrão) e a imagem nunca carregava.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpe?g|gif|webp|ico|css|js|map|woff2?|ttf)$).*)"],
};
