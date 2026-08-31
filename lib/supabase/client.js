"use client";
import { createBrowserClient } from "@supabase/ssr";

let clienteSingleton;

// 1 client por aba do navegador - reusa a mesma instância (e o mesmo socket
// realtime) em vez de recriar a cada render. Chave anônima só, mesma coisa
// exposta em qualquer Client Component - RLS quem segura o resto.
export function criarClienteSupabaseNavegador() {
  if (clienteSingleton) return clienteSingleton;
  clienteSingleton = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return clienteSingleton;
}
