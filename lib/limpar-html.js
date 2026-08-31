// O campo "texto" do DJEN vem como HTML completo (head/body/style) - isso
// tira as tags pra mostrar um resumo legível na lista de atualizações.
export function limparHtml(html, limite = 240) {
  if (!html) return "";
  const semTags = String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&ccedil;/g, "ç")
    .replace(/&atilde;/g, "ã")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&ordm;/g, "º")
    .replace(/&sect;/g, "§")
    .replace(/\s+/g, " ")
    .trim();
  return semTags.length > limite ? `${semTags.slice(0, limite)}…` : semTags;
}
