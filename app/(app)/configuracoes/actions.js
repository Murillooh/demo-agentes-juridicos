"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";

export async function atualizarEscritorio(_estadoAnterior, formData) {
  const nome = String(formData.get("nome") || "").trim();
  const logoUrl = String(formData.get("logoUrl") || "").trim();

  if (!nome) return { erro: "Informe o nome do escritório." };

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada. Entre novamente." };

  const { data: advogado } = await supabase
    .from("advogados")
    .select("escritorio_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!advogado) return { erro: "Perfil não encontrado." };

  const { error } = await supabase
    .from("escritorios")
    .update({ nome, logo_url: logoUrl || null })
    .eq("id", advogado.escritorio_id);
  if (error) return { erro: "Não foi possível salvar. Tente novamente." };

  // Sidebar (no layout) e o rodapé/logo em petições leem o nome/logo do
  // escritório - sem isso a mudança só apareceria depois de reload manual.
  revalidatePath("/", "layout");
  return { sucesso: "Escritório atualizado." };
}
