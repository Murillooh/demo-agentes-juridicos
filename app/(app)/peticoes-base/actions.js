"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import { AREAS_DIREITO } from "../../../lib/areas-direito";

export async function criarPeticaoBase(_estadoAnterior, formData) {
  const areaDireito = String(formData.get("areaDireito") || "").trim();
  const titulo = String(formData.get("titulo") || "").trim();
  const conteudo = String(formData.get("conteudo") || "").trim();

  if (!AREAS_DIREITO.includes(areaDireito)) return { erro: "Selecione uma área do direito válida." };
  if (!titulo) return { erro: "Informe um título." };
  if (conteudo.length < 200) {
    return { erro: "Cole o texto completo da petição (mínimo 200 caracteres) - é essa referência que a IA usa pra imitar o estilo." };
  }

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada. Entre novamente." };

  const { data: advogado } = await supabase
    .from("advogados")
    .select("escritorio_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!advogado) return { erro: "Perfil não encontrado." };

  const { error } = await supabase.from("peticoes_base").insert({
    escritorio_id: advogado.escritorio_id,
    area_direito: areaDireito,
    titulo,
    conteudo,
    criado_por: user.id,
  });
  if (error) return { erro: "Não foi possível salvar. Tente novamente." };

  revalidatePath("/peticoes-base");
  return { sucesso: "Petição-base cadastrada." };
}

export async function removerPeticaoBase(id) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return;

  await supabase.from("peticoes_base").delete().eq("id", id);
  revalidatePath("/peticoes-base");
}
