import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function quebrarLinhas(texto, fonte, tamanho, larguraMax) {
  const palavras = String(texto || "").split(/\s+/).filter(Boolean);
  const linhas = [];
  let atual = "";
  for (const palavra of palavras) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (fonte.widthOfTextAtSize(tentativa, tamanho) > larguraMax && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = tentativa;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [""];
}

// Mesma paleta de app/globals.css (--bg #0b1220, --accent #c9a24b).
const NAVY = rgb(0.043, 0.071, 0.126);
const GOLD = rgb(0.788, 0.635, 0.294);
const TEXT_DARK = rgb(0.13, 0.15, 0.19);
const TEXT_MUTED = rgb(0.46, 0.49, 0.56);
const TEXT_ON_NAVY = rgb(0.8, 0.83, 0.9);
const LINE_GRAY = rgb(0.86, 0.87, 0.9);
const WHITE = rgb(1, 1, 1);

// Extraído de app/api/peticoes/[id]/pdf/route.js (Etapa 2) na Etapa 7 -
// precisava ser chamado tanto pelo download manual quanto pelo envio
// automático pro OneDrive, sem duplicar a geração em 2 lugares.
export async function gerarPdfPeticao({ peticao, escritorio }) {
  const pdf = await PDFDocument.create();
  const fonteRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);

  const LARGURA = 595.28;
  const ALTURA = 841.89;
  const margem = 56;
  const larguraUtil = LARGURA - margem * 2;
  const RODAPE_Y = 50;
  const CABECALHO_H = 96;

  // Logo é uma URL externa (colada em Configurações) - se estiver fora do
  // ar ou não for PNG/JPG, a petição ainda tem que exportar (só sem logo),
  // nunca travar a exportação por isso.
  let logoImg = null;
  if (escritorio?.logo_url) {
    try {
      const resposta = await fetch(escritorio.logo_url, { signal: AbortSignal.timeout(5000) });
      if (resposta.ok) {
        const bytes = new Uint8Array(await resposta.arrayBuffer());
        const tipo = resposta.headers.get("content-type") || "";
        if (tipo.includes("png")) logoImg = await pdf.embedPng(bytes);
        else if (tipo.includes("jpeg") || tipo.includes("jpg")) logoImg = await pdf.embedJpg(bytes);
      }
    } catch {
      logoImg = null;
    }
  }

  let pagina;
  let y;

  function novaPagina(comCabecalhoCompleto) {
    pagina = pdf.addPage([LARGURA, ALTURA]);
    if (comCabecalhoCompleto) {
      pagina.drawRectangle({ x: 0, y: ALTURA - CABECALHO_H, width: LARGURA, height: CABECALHO_H, color: NAVY });
      pagina.drawRectangle({ x: 0, y: ALTURA - CABECALHO_H - 3, width: LARGURA, height: 3, color: GOLD });

      let xTexto = margem;
      if (logoImg) {
        const alturaLogo = 40;
        const larguraLogo = (logoImg.width / logoImg.height) * alturaLogo;
        pagina.drawImage(logoImg, {
          x: margem,
          y: ALTURA - CABECALHO_H + (CABECALHO_H - alturaLogo) / 2,
          width: larguraLogo,
          height: alturaLogo,
        });
        xTexto = margem + larguraLogo + 16;
      }
      pagina.drawText(escritorio?.nome || "", { x: xTexto, y: ALTURA - 42, size: 14, font: fonteNegrito, color: WHITE });
      pagina.drawText(peticao.area_direito, { x: xTexto, y: ALTURA - 60, size: 10, font: fonteRegular, color: GOLD });
      y = ALTURA - CABECALHO_H - 30;
    } else {
      pagina.drawRectangle({ x: 0, y: ALTURA - 30, width: LARGURA, height: 30, color: NAVY });
      pagina.drawText(`${peticao.titulo} — continuação`, {
        x: margem,
        y: ALTURA - 20,
        size: 8,
        font: fonteRegular,
        color: TEXT_ON_NAVY,
      });
      y = ALTURA - 30 - 24;
    }
  }

  function garantirEspaco(altura) {
    if (y - altura < RODAPE_Y) novaPagina(false);
  }

  function texto(conteudo, x, yPos, opcoes = {}) {
    const { tamanho = 11, fonte = fonteRegular, cor = TEXT_DARK } = opcoes;
    pagina.drawText(conteudo, { x, y: yPos, size: tamanho, font: fonte, color: cor });
  }

  novaPagina(true);

  texto(peticao.titulo, margem, y, { tamanho: 16, fonte: fonteNegrito, cor: NAVY });
  y -= 30;

  // Corpo: parágrafos separados por linha em branco (padrão do texto gerado
  // pela IA), cada um quebrado por largura de página.
  const paragrafos = peticao.conteudo.split(/\n{2,}/);
  for (const paragrafo of paragrafos) {
    const linhas = quebrarLinhas(paragrafo.replace(/\s*\n\s*/g, " ").trim(), fonteRegular, 11, larguraUtil);
    for (const linha of linhas) {
      garantirEspaco(16);
      texto(linha, margem, y, { tamanho: 11, cor: TEXT_DARK });
      y -= 16;
    }
    y -= 10;
  }

  const paginas = pdf.getPages();
  paginas.forEach((pg, i) => {
    pg.drawLine({ start: { x: margem, y: 32 }, end: { x: LARGURA - margem, y: 32 }, thickness: 0.5, color: LINE_GRAY });
    pg.drawText("Minuta gerada por IA — revisar antes de uso oficial.", {
      x: margem,
      y: 20,
      size: 7,
      font: fonteRegular,
      color: TEXT_MUTED,
    });
    const paginacao = `Página ${i + 1} de ${paginas.length}`;
    const larguraTexto = fonteRegular.widthOfTextAtSize(paginacao, 7);
    pg.drawText(paginacao, { x: LARGURA - margem - larguraTexto, y: 20, size: 7, font: fonteRegular, color: TEXT_MUTED });
  });

  return pdf.save();
}
