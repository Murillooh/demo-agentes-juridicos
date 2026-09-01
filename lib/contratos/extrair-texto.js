import "server-only";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

// MIN_CARACTERES_TEXTO mora em ./constantes.js, não aqui - ver o comentário
// lá (esse arquivo é justamente o que ela precisa NÃO carregar).

// pdf-parse (PDF) e mammoth (DOCX) - os 2 só leem texto já embutido no
// arquivo. PDF escaneado (só imagem, sem camada de texto) devolve string
// vazia ou quase vazia - é o chamador (contratos/actions.js) que decide,
// pelo tamanho do resultado, se trata como "sem_texto" em vez de tentar
// analisar isso com a IA (que inventaria conteúdo pra preencher a lacuna).
// OCR de verdade (Azure Document Intelligence, Google Vision etc) resolveria
// isso, mas é uma integração à parte - fora do escopo desta versão.
export async function extrairTexto(bytes, tipoArquivo) {
  if (tipoArquivo === "pdf") {
    // pdf-parse 2.x troca a função antiga (v1: default export chamável)
    // por uma classe - new PDFParse({data}).getText(), sempre com
    // destroy() depois (libera o documento carregado em memória pelo
    // pdf.js interno).
    const parser = new PDFParse({ data: Buffer.from(bytes) });
    try {
      const resultado = await parser.getText();
      return resultado.text || "";
    } finally {
      await parser.destroy();
    }
  }
  if (tipoArquivo === "docx") {
    const resultado = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return resultado.value || "";
  }
  throw new Error("Tipo de arquivo não suportado.");
}
