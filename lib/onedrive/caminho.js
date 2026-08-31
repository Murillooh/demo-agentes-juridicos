import "server-only";

function sanitizar(texto) {
  return String(texto || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

// Convenção de pasta: {Escritório}/Clientes/{Cliente}/Peticoes/{arquivo}.pdf
// "id curto" (8 primeiros caracteres do uuid) no nome do arquivo evita
// colisão entre 2 petições com o mesmo título pro mesmo cliente. Reenviar a
// MESMA petição gera o mesmo caminho de novo - sobrescreve de propósito
// (conflictBehavior=replace em lib/onedrive/graph.js), é uma atualização
// do mesmo arquivo, não uma cópia nova toda vez que alguém tenta de novo.
export function montarCaminhoPeticao({ nomeEscritorio, nomeCliente, titulo, peticaoId }) {
  const pasta = [
    sanitizar(nomeEscritorio) || "Escritorio",
    "Clientes",
    sanitizar(nomeCliente) || "Sem cliente definido",
    "Peticoes",
  ].join("/");
  const arquivo = `${sanitizar(titulo) || "Peticao"} (${peticaoId.slice(0, 8)}).pdf`;
  return `${pasta}/${arquivo}`;
}
