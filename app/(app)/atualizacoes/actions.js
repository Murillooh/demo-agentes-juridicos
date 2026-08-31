"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import { executarVerificacaoDiario } from "../../../lib/verificar-diario";

export async function marcarLida(id) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return;

  await supabase.from("atualizacoes_diario").update({ lida: true }).eq("id", id);
  revalidatePath("/atualizacoes");
}

// Botão manual - reprocessa só as OABs do próprio escritório (não o
// sistema inteiro, isso é o job/cron). Útil pra testar sem esperar o
// horário agendado.
export async function verificarAgora() {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  const { data: advogado } = await supabase
    .from("advogados")
    .select("escritorio_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!advogado) return { erro: "Perfil não encontrado." };

  const resultado = await executarVerificacaoDiario({ apenasEscritorioId: advogado.escritorio_id });
  revalidatePath("/atualizacoes");
  return resultado;
}
