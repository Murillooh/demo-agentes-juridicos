import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase pro servidor (Server Components, Route Handlers, Server
// Actions). Lê/escreve a sessão nos cookies da requisição.
//
// Devolve null se as env vars não estiverem configuradas - evita derrubar
// o site inteiro com 500 (createServerClient lança exceção síncrona com
// URL/key vazias). Ver lib/supabase/server.js do demo-agentes-juridicos -
// mesmo bug já foi resolvido lá.
export function criarClienteSupabaseServidor() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          cookiesParaGravar.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component (não pode gravar cookie) -
          // sem problema, o middleware já cuida de renovar a sessão a cada request.
        }
      },
    },
  });
}

// Um engasgo do Supabase em auth.getUser() sem timeout trava a página/rota
// inteira até a Vercel matar a função. Toda chamada a getUser() no servidor
// passa por aqui em vez de chamar direto.
export async function obterUsuario(supabase, timeoutMs = 5000) {
  if (!supabase) return null;
  try {
    const {
      data: { user },
    } = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    return user;
  } catch {
    return null;
  }
}
