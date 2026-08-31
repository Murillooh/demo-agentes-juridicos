"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import { criarClienteAnthropic } from "../../../lib/anthropic";
import { AREAS_DIREITO } from "../../../lib/areas-direito";

// Não manda a base inteira como referência - uma amostra representativa
// (as mais recentes) já dá o "jeito de escrever", e mantém o prompt dentro
// de um tamanho razoável mesmo com muita petição-base cadastrada.
const MAX_EXEMPLOS_ESTILO = 3;

export async function gerarPeticao(_estadoAnterior, formData) {
  const areaDireito = String(formData.get("areaDireito") || "").trim();
  const titulo = String(formData.get("titulo") || "").trim();
  const descricaoCaso = String(formData.get("descricaoCaso") || "").trim();

  if (!AREAS_DIREITO.includes(areaDireito)) return { erro: "Selecione uma área do direito válida." };
  if (!titulo) return { erro: "Dê um título pra essa petição." };
  if (descricaoCaso.length < 30) {
    return { erro: "Descreva o caso com mais detalhe (ou cole os dados do processo)." };
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

  const { data: exemplos, error: erroExemplos } = await supabase
    .from("peticoes_base")
    .select("titulo, conteudo")
    .eq("escritorio_id", advogado.escritorio_id)
    .eq("area_direito", areaDireito)
    .order("criado_em", { ascending: false })
    .limit(MAX_EXEMPLOS_ESTILO);

  if (erroExemplos) return { erro: "Não foi possível carregar as petições-base. Tente novamente." };

  // Mensagem clara, não um erro genérico - critério de qualidade explícito
  // da Etapa 2 ("área ainda sem petição-base cadastrada").
  if (!exemplos || exemplos.length === 0) {
    return {
      erro: `Ainda não existe petição-base cadastrada pra "${areaDireito}" nesse escritório. Cadastre pelo menos uma em Petições-base antes de gerar.`,
      semReferencia: true,
    };
  }

  const anthropic = criarClienteAnthropic();
  if (!anthropic) {
    return { erro: "Geração por IA ainda não configurada neste ambiente (falta ANTHROPIC_API_KEY)." };
  }

  const blocoExemplos = exemplos
    .map((ex, i) => `### Exemplo ${i + 1} - "${ex.titulo}"\n\n${ex.conteudo}`)
    .join("\n\n---\n\n");

  const systemPrompt = `Você é um assistente jurídico que redige minutas de petições em português do Brasil.

Sua ÚNICA referência de estilo são os exemplos reais abaixo, escritos por este escritório de advocacia. Imite o "jeito de escrever" deles: vocabulário, formalidade, forma de estruturar a fundamentação, jeito de citar lei/jurisprudência, saudações e fechamentos. NÃO copie o conteúdo factual dos exemplos - use-os só como referência de estilo e estrutura pro caso novo descrito pelo usuário.

O texto gerado é sempre uma MINUTA para revisão de um advogado antes de qualquer uso real - nunca afirme fatos que não foram informados no caso descrito, e não invente número de processo, valor de causa ou data se não foram dados.

${blocoExemplos}`;

  let conteudoGerado;
  try {
    // .stream().finalMessage() em vez de messages.create() direto - texto de
    // petição pode passar de alguns milhares de tokens, e streaming evita
    // bater no timeout HTTP do SDK numa geração mais longa.
    const stream = anthropic.messages.stream({
      model: "claude-opus-5",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Área do direito: ${areaDireito}\n\nCaso:\n${descricaoCaso}\n\nEscreva a minuta completa da petição pra esse caso, no estilo dos exemplos acima.`,
        },
      ],
    });
    const resposta = await stream.finalMessage();
    conteudoGerado = resposta.content.find((b) => b.type === "text")?.text || "";
    if (!conteudoGerado) {
      return { erro: "A IA não devolveu texto. Tente novamente." };
    }
  } catch {
    return { erro: "Falha ao gerar a petição com a IA. Tente novamente em instantes." };
  }

  const { data: peticaoCriada, error: erroPeticao } = await supabase
    .from("peticoes")
    .insert({
      escritorio_id: advogado.escritorio_id,
      advogado_id: user.id,
      area_direito: areaDireito,
      titulo,
      conteudo: conteudoGerado,
      status: "rascunho",
    })
    .select("id")
    .single();

  if (erroPeticao) return { erro: "Petição gerada, mas não foi possível salvar. Tente novamente." };

  redirect(`/peticoes/${peticaoCriada.id}`);
}

export async function salvarPeticao(id, conteudo) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  const { error } = await supabase
    .from("peticoes")
    .update({ conteudo, atualizado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };

  revalidatePath(`/peticoes/${id}`);
  return { sucesso: true };
}

// Preenchido depois de protocolar - sem isso, a Etapa 4 (Diário Oficial)
// nunca consegue vincular uma atualização a essa petição (o número não
// existia no modelo de dados até essa etapa precisar dele).
export async function salvarNumeroProcesso(id, numeroProcesso) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  const limpo = String(numeroProcesso || "").replace(/\D/g, "");
  const { error } = await supabase
    .from("peticoes")
    .update({ numero_processo: limpo || null })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar o número do processo." };

  revalidatePath(`/peticoes/${id}`);
  return { sucesso: true };
}

// Etapa 7 - nenhuma etapa anterior capturou "de qual cliente é essa
// petição" (Etapa 2 só pede área do direito + descrição do caso). Sem
// isso não tem como montar a convenção de pasta por cliente no OneDrive -
// mesmo padrão de campo editável pós-criação do número de processo acima.
export async function salvarNomeCliente(id, nomeCliente) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  const { error } = await supabase
    .from("peticoes")
    .update({ nome_cliente: String(nomeCliente || "").trim() || null })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar o nome do cliente." };

  revalidatePath(`/peticoes/${id}`);
  return { sucesso: true };
}

export async function finalizarPeticao(id) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  const { error } = await supabase
    .from("peticoes")
    .update({ status: "finalizada", atualizado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) return { erro: "Não foi possível finalizar." };

  revalidatePath(`/peticoes/${id}`);
  return { sucesso: true };
}
