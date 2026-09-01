"use server";

import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import { buscarProcessoNoDatajud } from "../../../lib/datajud";

export async function buscarProcesso(_estadoAnterior, formData) {
  const numeroCnj = String(formData.get("numeroCnj") || "").trim();
  const tribunal = String(formData.get("tribunal") || "").trim();

  if (!numeroCnj) return { erro: "Informe o número do processo." };
  if (!tribunal) return { erro: "Selecione o tribunal (ou cole um número CNJ válido pra detectar sozinho)." };

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada. Entre novamente." };

  const resultado = await buscarProcessoNoDatajud(numeroCnj, tribunal);

  if (!resultado.configurado) return { erro: resultado.mensagem };
  if (resultado.erro) return { erro: resultado.erro };
  if (resultado.naoEncontrado) return { erro: resultado.mensagem };

  return { sucesso: true, processo: resultado.processo, numeroCnj, tribunal };
}

// Passa a acompanhar um processo já buscado - verificação automática entra
// no mesmo cron diário (lib/verificar-processos.js), notifica quando o
// andamento mudar.
export async function acompanharProcesso(numeroCnj, tribunal, situacaoAtual) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  const { data: advogado } = await supabase.from("advogados").select("escritorio_id").eq("id", user.id).maybeSingle();
  if (!advogado) return { erro: "Perfil não encontrado." };

  const { error } = await supabase.from("processos_monitorados").insert({
    escritorio_id: advogado.escritorio_id,
    advogado_id: user.id,
    numero_cnj: numeroCnj,
    tribunal,
    situacao_atual: situacaoAtual || null,
    ultima_verificacao: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "23505") return { erro: "Esse processo já está sendo acompanhado." };
    return { erro: "Não foi possível adicionar ao acompanhamento." };
  }

  revalidatePath("/processos/acompanhamento");
  return { sucesso: true };
}

export async function removerAcompanhamento(id) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return;

  await supabase.from("processos_monitorados").delete().eq("id", id);
  revalidatePath("/processos/acompanhamento");
}
