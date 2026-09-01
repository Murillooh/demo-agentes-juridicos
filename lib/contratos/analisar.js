import "server-only";
import { criarClienteAnthropic } from "../anthropic";

// ~15k tokens de entrada - contrato mais longo que isso é truncado antes de
// mandar pra IA. Fica marcado no resultado (texto_truncado_na_analise), não
// escondido - o advogado precisa saber que a leitura não cobriu o
// documento inteiro.
const MAX_CARACTERES_PROMPT = 60000;

function extrairJson(texto) {
  // Claude às vezes envolve em ```json ... ``` mesmo pedindo só JSON puro -
  // limpa antes de parsear (mesmo tratamento de app/(app)/prazos/actions.js).
  const limpo = texto.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  return JSON.parse(limpo);
}

const SYSTEM_PROMPT = `Você lê contratos em português do Brasil e devolve uma leitura estruturada, NUNCA um parecer jurídico definitivo - a decisão final é sempre de um advogado humano depois.

Responda APENAS com um JSON válido, sem nenhum texto antes ou depois, nesse formato exato:
{"partes": [{"nome": string, "papel": string}], "objeto": string, "vigencia": string, "multaRescisao": string, "pontosAtencao": [string]}

Regras:
- "partes": cada parte envolvida (nome ou razão social, se aparecer) e o papel dela (ex.: "contratante", "contratada", "locador", "locatário"). Se não conseguir identificar uma parte com segurança, não invente - descreva o que está escrito.
- "objeto": resumo objetivo do que o contrato regula.
- "vigencia": prazo/vigência (início, duração, renovação automática se houver). Se não encontrar cláusula clara de vigência, diga isso explicitamente em vez de inventar uma data.
- "multaRescisao": cláusulas de multa e/ou rescisão, resumidas. Se não encontrar, diga isso explicitamente.
- "pontosAtencao": lista de ambiguidades, cláusulas fora do padrão, ou omissões que mereçam atenção antes de assinar/prosseguir. Pode ser lista vazia se o contrato parecer padrão - NUNCA invente ponto de atenção só pra preencher a lista.
- Nunca afirme validade jurídica nem recomende assinar/não assinar - só descreva o que está no texto.`;

export async function analisarContrato(textoContrato) {
  const anthropic = criarClienteAnthropic();
  if (!anthropic) {
    return { erro: "Análise por IA ainda não configurada neste ambiente (falta ANTHROPIC_API_KEY)." };
  }

  const truncado = textoContrato.length > MAX_CARACTERES_PROMPT;
  const textoParaAnalise = truncado ? textoContrato.slice(0, MAX_CARACTERES_PROMPT) : textoContrato;

  try {
    // .stream().finalMessage() em vez de messages.create() direto - contrato
    // longo (mesmo truncado em 60k caracteres) pode levar um tempo bom pra
    // gerar a análise, streaming evita bater no timeout HTTP do SDK.
    const stream = anthropic.messages.stream({
      model: "claude-opus-5",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: textoParaAnalise }],
    });
    const resposta = await stream.finalMessage();
    const textoResposta = resposta.content.find((b) => b.type === "text")?.text || "";
    const resultado = extrairJson(textoResposta);
    return { sucesso: true, resultado, truncado };
  } catch (e) {
    // Log real do que quebrou (rede, chave sem crédito, JSON malformado
    // etc.) - sem isso, todo mundo via só a mensagem genérica pro usuário
    // e não tinha como saber a causa real nem no log da Vercel (foi
    // exatamente o que aconteceu: o erro real era "credit balance too
    // low" da Anthropic, e ficava invisível).
    console.error("[analisarContrato] falhou:", e?.message || e);
    return { erro: "Falha ao analisar o contrato com a IA. Tente de novo em instantes." };
  }
}
