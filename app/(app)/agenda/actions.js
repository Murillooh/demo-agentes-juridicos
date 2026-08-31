"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";

// Reunião manual - distinta de prazo (tipo='reuniao'), petição é opcional
// (schema permite peticao_id nulo; a Etapa 3 só exige que DÊ pra vincular).
export async function criarReuniao(_estadoAnterior, formData) {
  const titulo = String(formData.get("titulo") || "").trim();
  const data = String(formData.get("data") || "").trim();
  const peticaoId = String(formData.get("peticaoId") || "").trim() || null;

  if (!titulo) return { erro: "Dê um título pra reunião." };
  if (!data) return { erro: "Informe a data." };

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada. Entre novamente." };

  const { data: advogado } = await supabase
    .from("advogados")
    .select("escritorio_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!advogado) return { erro: "Perfil não encontrado." };

  const { error } = await supabase.from("eventos_agenda").insert({
    escritorio_id: advogado.escritorio_id,
    advogado_id: user.id,
    tipo: "reuniao",
    titulo,
    data,
    peticao_id: peticaoId,
  });
  if (error) return { erro: "Não foi possível criar a reunião. Tente novamente." };

  redirect(`/agenda?data=${data}`);
}

// Só remove evento tipo "reuniao" direto - um evento "prazo" é reflexo de
// um registro em Prazos, cancelar isso é feature de gestão de prazo (fora
// do escopo desta etapa), não uma remoção solta na agenda.
export async function removerReuniao(id) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return;

  await supabase.from("eventos_agenda").delete().eq("id", id).eq("tipo", "reuniao");
  revalidatePath("/agenda");
}
