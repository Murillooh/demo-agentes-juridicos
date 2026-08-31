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

// Etapa 5 - canal de notificação é preferência do escritório (1 linha,
// upsert). Lido direto do banco a cada envio (lib/notificacoes/enfileirar.js)
// - trocar aqui vale a partir do próximo envio, sem deploy (critério de
// aceite explícito da Etapa 5).
export async function salvarConfiguracaoNotificacao(_estadoAnterior, formData) {
  const canalEmail = formData.get("canalEmail") === "on";
  const canalWhatsapp = formData.get("canalWhatsapp") === "on";

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  const { data: advogado } = await supabase.from("advogados").select("escritorio_id").eq("id", user.id).maybeSingle();
  if (!advogado) return { erro: "Perfil não encontrado." };

  const { error } = await supabase.from("configuracoes_notificacao").upsert(
    {
      escritorio_id: advogado.escritorio_id,
      canal_email: canalEmail,
      canal_whatsapp: canalWhatsapp,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "escritorio_id" }
  );
  if (error) return { erro: "Não foi possível salvar." };

  revalidatePath("/configuracoes");
  return { sucesso: "Preferências de notificação salvas." };
}

// Contato de WhatsApp é por advogado (cada um recebe no próprio número) -
// mesma policy de "atualiza o proprio registro" já usada pra outros campos
// de advogados.
export async function salvarTelefoneWhatsapp(_estadoAnterior, formData) {
  const telefone = String(formData.get("telefone") || "").trim();
  if (telefone && !/^\+\d{8,15}$/.test(telefone)) {
    return { erro: "Número inválido. Use o formato internacional, ex.: +5511999998888." };
  }

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  const { error } = await supabase.from("advogados").update({ telefone_whatsapp: telefone || null }).eq("id", user.id);
  if (error) return { erro: "Não foi possível salvar." };

  revalidatePath("/configuracoes");
  return { sucesso: "Número do WhatsApp salvo." };
}
