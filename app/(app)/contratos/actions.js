"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { extrairTexto, MIN_CARACTERES_TEXTO } from "../../../lib/contratos/extrair-texto";
import { analisarContrato } from "../../../lib/contratos/analisar";

const TIPOS_ACEITOS = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
// Contrato jurídico comum fica bem abaixo disso - o limite existe pra não
// deixar a function presa extraindo texto de um arquivo gigante.
const TAMANHO_MAXIMO = 15 * 1024 * 1024;
// texto_extraido guarda o texto puro pra permitir reanalisar sem reler o
// arquivo - corta num tamanho generoso pra não estourar o banco com
// contrato absurdamente longo.
const MAX_CARACTERES_ARMAZENADOS = 200000;

function camposResultado(analise) {
  return {
    texto_truncado_na_analise: analise.truncado,
    partes: analise.resultado.partes || [],
    objeto: analise.resultado.objeto || null,
    vigencia: analise.resultado.vigencia || null,
    clausula_multa_rescisao: analise.resultado.multaRescisao || null,
    pontos_atencao: analise.resultado.pontosAtencao || [],
  };
}

export async function enviarContrato(_estadoAnterior, formData) {
  const arquivo = formData.get("arquivo");
  if (!arquivo || typeof arquivo === "string" || !arquivo.size) {
    return { erro: "Selecione um arquivo PDF ou DOCX." };
  }

  const tipoArquivo = TIPOS_ACEITOS[arquivo.type];
  if (!tipoArquivo) return { erro: "Formato não suportado - envie um PDF ou DOCX." };
  if (arquivo.size > TAMANHO_MAXIMO) return { erro: "Arquivo muito grande (máximo 15MB)." };

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada. Entre novamente." };

  const { data: advogado } = await supabase.from("advogados").select("escritorio_id").eq("id", user.id).maybeSingle();
  if (!advogado) return { erro: "Perfil não encontrado." };

  const admin = criarClienteSupabaseAdmin();
  if (!admin) return { erro: "Não configurado neste ambiente (falta SUPABASE_SERVICE_ROLE_KEY)." };

  const contratoId = randomUUID();
  const caminho = `${advogado.escritorio_id}/${contratoId}.${tipoArquivo}`;
  const bytes = new Uint8Array(await arquivo.arrayBuffer());

  // Bucket privado (migration 008) - upload sempre via service role, não
  // existe policy de storage.objects pra sessão comum.
  const { error: erroUpload } = await admin.storage.from("contratos").upload(caminho, bytes, {
    contentType: arquivo.type,
    upsert: false,
  });
  if (erroUpload) return { erro: "Não foi possível salvar o arquivo. Tente novamente." };

  const baseLinha = {
    id: contratoId,
    escritorio_id: advogado.escritorio_id,
    advogado_id: user.id,
    nome_arquivo: arquivo.name,
    tipo_arquivo: tipoArquivo,
    caminho_armazenamento: caminho,
    tamanho_bytes: arquivo.size,
  };

  // A partir daqui o arquivo já está salvo no Storage - qualquer falha
  // abaixo ainda grava uma linha (status 'sem_texto'/'falha') em vez de
  // sumir sem rastro. Mesmo requisito de "não perder o que já foi feito"
  // já aplicado nas integrações anteriores (Etapas 5 e 7).
  let texto = "";
  try {
    texto = await extrairTexto(bytes, tipoArquivo);
  } catch {
    await supabase.from("contratos").insert({
      ...baseLinha,
      status: "falha",
      erro: "Não foi possível ler o conteúdo do arquivo (pode estar corrompido ou num formato inesperado).",
    });
    redirect(`/contratos/${contratoId}`);
  }

  const textoLimpo = texto.trim();
  if (textoLimpo.length < MIN_CARACTERES_TEXTO) {
    // Sem texto suficiente - provavelmente PDF/DOCX escaneado (imagem, sem
    // camada de texto). OCR resolveria isso, mas é integração à parte
    // (fora do escopo desta versão) - fica registrado com status próprio,
    // nunca como análise vazia ou erro genérico.
    await supabase.from("contratos").insert({
      ...baseLinha,
      status: "sem_texto",
      texto_extraido: textoLimpo || null,
    });
    redirect(`/contratos/${contratoId}`);
  }

  const analise = await analisarContrato(textoLimpo);

  if (analise.erro) {
    await supabase.from("contratos").insert({
      ...baseLinha,
      status: "falha",
      erro: analise.erro,
      texto_extraido: textoLimpo.slice(0, MAX_CARACTERES_ARMAZENADOS),
    });
    redirect(`/contratos/${contratoId}`);
  }

  await supabase.from("contratos").insert({
    ...baseLinha,
    status: "concluido",
    texto_extraido: textoLimpo.slice(0, MAX_CARACTERES_ARMAZENADOS),
    ...camposResultado(analise),
  });

  redirect(`/contratos/${contratoId}`);
}

// Reroda só a IA em cima do texto já extraído - não reprocessa o arquivo
// original. "jeito claro de tentar de novo" quando a análise falhou, ou
// simplesmente pra gerar uma leitura nova.
export async function reanalisarContrato(id) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  const { data: contrato } = await supabase.from("contratos").select("texto_extraido").eq("id", id).maybeSingle();
  if (!contrato) return { erro: "Contrato não encontrado." };
  if (!contrato.texto_extraido) {
    return { erro: "Não há texto extraído pra reanalisar (documento sem camada de texto)." };
  }

  const analise = await analisarContrato(contrato.texto_extraido);

  if (analise.erro) {
    await supabase
      .from("contratos")
      .update({ status: "falha", erro: analise.erro, atualizado_em: new Date().toISOString() })
      .eq("id", id);
    revalidatePath(`/contratos/${id}`);
    return { erro: analise.erro };
  }

  await supabase
    .from("contratos")
    .update({ status: "concluido", erro: null, atualizado_em: new Date().toISOString(), ...camposResultado(analise) })
    .eq("id", id);

  revalidatePath(`/contratos/${id}`);
  return { sucesso: true };
}
