"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";

export async function marcarTourVisto() {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return;

  const { error } = await supabase.from("advogados").update({ tour_visto: true }).eq("id", user.id);
  if (error) throw error;

  // Sem isso o /dashboard fica servindo a página cacheada com tour_visto
  // antigo (false) - atualizar a página trazia o tour de volta mesmo já
  // tendo sido fechado.
  revalidatePath("/dashboard");
}
