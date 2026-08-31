"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";

export async function marcarNotificacaoLida(id) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return;

  await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
  revalidatePath("/notificacoes");
}
