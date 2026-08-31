"use server";

import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";

export async function marcarTourVisto() {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return;

  await supabase.from("advogados").update({ tour_visto: true }).eq("id", user.id);
}
