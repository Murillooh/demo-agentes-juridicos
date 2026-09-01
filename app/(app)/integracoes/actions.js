"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { enviarPeticaoParaGoogleDrive } from "../../../lib/googledrive/enviar-peticao";

// integracoes_googledrive não tem policy de escrita pra sessão comum
// (migration 010) - as duas ações aqui precisam do client admin. A
// checagem de sessão/escritório continua com o client normal, é ela quem
// garante que só quem está logado nesse escritório desconecta a conexão
// DESSE escritório.
export async function desconectarGoogleDrive() {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  const { data: advogado } = await supabase.from("advogados").select("escritorio_id").eq("id", user.id).maybeSingle();
  if (!advogado) return { erro: "Perfil não encontrado." };

  const admin = criarClienteSupabaseAdmin();
  if (!admin) return { erro: "Não configurado neste ambiente." };

  // DELETE, não um campo "desconectado" - petições já enviadas (peticoes.
  // googledrive_*) não dependem dessa linha existir, é assim que
  // reconectar depois não perde nada (critério de aceite explícito da
  // Etapa 7).
  const { error } = await admin.from("integracoes_googledrive").delete().eq("escritorio_id", advogado.escritorio_id);
  if (error) return { erro: "Não foi possível desconectar." };

  revalidatePath("/integracoes");
  return { sucesso: true };
}

// Botão "Tentar de novo" de uma petição com googledrive_status='falha'.
export async function reenviarPeticaoGoogleDrive(id) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  // enviarPeticaoParaGoogleDrive roda com o client admin (precisa gravar
  // em integracoes_googledrive) - essa leitura com o client da sessão é
  // quem garante que o ID pedido pertence ao escritório de quem clicou.
  const { data: peticao } = await supabase.from("peticoes").select("id").eq("id", id).maybeSingle();
  if (!peticao) return { erro: "Petição não encontrada." };

  await enviarPeticaoParaGoogleDrive(id);
  revalidatePath("/integracoes");
  revalidatePath("/board");
  return { sucesso: true };
}
