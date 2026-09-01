// Separado de extrair-texto.js de propósito - esse arquivo importa
// pdf-parse/mammoth (pesados, um deles precisa de @napi-rs/canvas no
// serverless da Vercel), então qualquer import estático de lá, mesmo só
// pra pegar uma constante, carrega os dois juntos (import de módulo ES
// não é seletivo - executa o arquivo inteiro). contratos/actions.js
// precisa desse número fora do import dinâmico de extrairTexto (ver
// enviarContrato), daí vive isolado aqui.

// Abaixo disso, considera "sem texto extraível" - documento provavelmente
// escaneado (imagem, sem camada de texto), não um contrato curto de
// verdade (contrato real tem no mínimo algumas cláusulas). Heurística
// simples, não detecção de OCR de verdade.
export const MIN_CARACTERES_TEXTO = 200;
