"use server";

import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import { criarClienteAnthropic } from "../../../lib/anthropic";
import { somarDias, formatarDataISO } from "../../../lib/dias-uteis";

function extrairJson(texto) {
  // Claude às vezes envolve em ```json ... ``` mesmo pedindo só JSON puro -
  // limpa antes de parsear em vez de deixar JSON.parse quebrar por isso.
  const limpo = texto.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  return JSON.parse(limpo);
}

async function criarPrazoEEvento({ supabase, user, escritorioId, peticaoId, despachoTexto, descricaoPrazo, dataDespacho, dataLimite }) {
  const { data: prazoCriado, error: erroPrazo } = await supabase
    .from("prazos")
    .insert({
      escritorio_id: escritorioId,
      peticao_id: peticaoId,
      despacho_texto: despachoTexto,
      descricao_prazo: descricaoPrazo,
      data_despacho: dataDespacho,
      data_limite: dataLimite,
      criado_por: user.id,
    })
    .select("id")
    .single();
  if (erroPrazo) return { erro: "Não foi possível salvar o prazo. Tente novamente." };

  const { error: erroEvento } = await supabase.from("eventos_agenda").insert({
    escritorio_id: escritorioId,
    advogado_id: user.id,
    tipo: "prazo",
    titulo: descricaoPrazo,
    data: dataLimite,
    peticao_id: peticaoId,
    prazo_id: prazoCriado.id,
  });
  if (erroEvento) {
    return { erro: "Prazo salvo, mas não foi possível criar o evento na agenda. Confira em Prazos." };
  }

  redirect(`/agenda?data=${dataLimite}`);
}

// Cola o despacho -> IA tenta identificar o prazo. Confiança baixa ou "não
// identificado" NUNCA cria prazo sozinho - devolve aviso pro formulário
// mostrar o fallback manual (critério de qualidade explícito da Etapa 3).
export async function identificarPrazo(_estadoAnterior, formData) {
  const peticaoId = String(formData.get("peticaoId") || "").trim();
  const despachoTexto = String(formData.get("despachoTexto") || "").trim();
  const dataDespacho = String(formData.get("dataDespacho") || "").trim();

  if (!peticaoId) return { erro: "Selecione a petição/processo de origem." };
  if (despachoTexto.length < 15) return { erro: "Cole o texto do despacho." };
  if (!dataDespacho) return { erro: "Informe a data do despacho." };

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada. Entre novamente." };

  const { data: advogado } = await supabase
    .from("advogados")
    .select("escritorio_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!advogado) return { erro: "Perfil não encontrado." };

  const { data: peticao } = await supabase.from("peticoes").select("id").eq("id", peticaoId).maybeSingle();
  if (!peticao) return { erro: "Petição não encontrada." };

  const anthropic = criarClienteAnthropic();
  if (!anthropic) {
    return { erro: "Identificação de prazo por IA ainda não configurada neste ambiente (falta ANTHROPIC_API_KEY)." };
  }

  const systemPrompt = `Você identifica prazos processuais em despachos jurídicos brasileiros.

Responda APENAS com um JSON válido, sem nenhum texto antes ou depois, nesse formato exato:
{"identificado": boolean, "descricaoPrazo": string ou null, "quantidadeDias": number ou null, "diasUteis": boolean ou null, "confianca": "alta" ou "media" ou "baixa"}

Regras:
- "quantidadeDias" é sempre a quantidade de dias a partir da data do despacho.
- "diasUteis" só é true se o texto disser explicitamente "dias úteis". Prazo em "dias" sem qualificação é dia corrido (diasUteis: false).
- Se o despacho tiver mais de um prazo, identifique o prazo principal/mais urgente.
- Se não houver menção clara de prazo, ou se você tiver qualquer dúvida real sobre a quantidade de dias, responda identificado:false e confianca:"baixa". É muito melhor avisar o advogado do que arriscar uma data errada - nesse domínio, um prazo perdido por data incorreta é grave.`;

  let resultado;
  try {
    const resposta = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: systemPrompt,
      messages: [{ role: "user", content: despachoTexto }],
    });
    const textoResposta = resposta.content.find((b) => b.type === "text")?.text || "";
    resultado = extrairJson(textoResposta);
  } catch {
    // Cobre tanto falha de rede/API quanto JSON malformado - os dois casos
    // significam "não dá pra confiar nesse resultado", tratamento igual ao
    // de confiança baixa.
    resultado = null;
  }

  if (!resultado?.identificado || resultado.confianca === "baixa" || !resultado.quantidadeDias) {
    return {
      naoIdentificado: true,
      aviso:
        "Não consegui identificar o prazo com confiança suficiente nesse despacho. Revise manualmente abaixo, ou informe a quantidade de dias direto.",
      peticaoId,
      despachoTexto,
      dataDespacho,
    };
  }

  const dataLimite = formatarDataISO(somarDias(dataDespacho, resultado.quantidadeDias, !!resultado.diasUteis));

  return criarPrazoEEvento({
    supabase,
    user,
    escritorioId: advogado.escritorio_id,
    peticaoId,
    despachoTexto,
    descricaoPrazo: resultado.descricaoPrazo || `Prazo de ${resultado.quantidadeDias} dia(s)`,
    dataDespacho,
    dataLimite,
  });
}

// Fallback quando a IA não identifica com confiança - advogado informa a
// quantidade de dias direto, sem depender da IA nenhuma vez mais.
export async function criarPrazoManual(_estadoAnterior, formData) {
  const peticaoId = String(formData.get("peticaoId") || "").trim();
  const despachoTexto = String(formData.get("despachoTexto") || "").trim();
  const dataDespacho = String(formData.get("dataDespacho") || "").trim();
  const descricaoPrazo = String(formData.get("descricaoPrazo") || "").trim();
  const quantidadeDias = Number(formData.get("quantidadeDias"));
  const diasUteis = formData.get("diasUteis") === "on";

  if (!peticaoId || !despachoTexto || !dataDespacho) return { erro: "Dados incompletos - volte e tente de novo." };
  if (!descricaoPrazo) return { erro: "Descreva o prazo (ex.: \"Contestação\")." };
  if (!quantidadeDias || quantidadeDias <= 0) return { erro: "Informe a quantidade de dias (maior que zero)." };

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada. Entre novamente." };

  const { data: advogado } = await supabase
    .from("advogados")
    .select("escritorio_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!advogado) return { erro: "Perfil não encontrado." };

  const dataLimite = formatarDataISO(somarDias(dataDespacho, quantidadeDias, diasUteis));

  return criarPrazoEEvento({
    supabase,
    user,
    escritorioId: advogado.escritorio_id,
    peticaoId,
    despachoTexto,
    descricaoPrazo,
    dataDespacho,
    dataLimite,
  });
}
