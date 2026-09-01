// Portado quase idêntico de demo-agentes-juridicos - já era puro e
// genérico, sem nada específico daquele projeto.

// Lista curta dos tribunais mais comuns. Adicione outros conforme o
// escritório precisar - o "alias" segue a convenção pública do DataJud
// (sigla em minúsculo -> api_publica_<alias>).
export const TRIBUNAIS = [
  { sigla: "TJSP", nome: "TJ São Paulo" },
  { sigla: "TJRJ", nome: "TJ Rio de Janeiro" },
  { sigla: "TJMG", nome: "TJ Minas Gerais" },
  { sigla: "TJRS", nome: "TJ Rio Grande do Sul" },
  { sigla: "TJPR", nome: "TJ Paraná" },
  { sigla: "TJSC", nome: "TJ Santa Catarina" },
  { sigla: "TJBA", nome: "TJ Bahia" },
  { sigla: "TJPE", nome: "TJ Pernambuco" },
  { sigla: "TJCE", nome: "TJ Ceará" },
  { sigla: "TJGO", nome: "TJ Goiás" },
  { sigla: "TJDFT", nome: "TJ Distrito Federal" },
  { sigla: "TRF1", nome: "TRF 1ª Região" },
  { sigla: "TRF2", nome: "TRF 2ª Região" },
  { sigla: "TRF3", nome: "TRF 3ª Região" },
  { sigla: "TRF4", nome: "TRF 4ª Região" },
  { sigla: "TRF5", nome: "TRF 5ª Região" },
  { sigla: "TRF6", nome: "TRF 6ª Região" },
  { sigla: "TRT2", nome: "TRT 2ª Região (SP)" },
  { sigla: "TRT15", nome: "TRT 15ª Região (Campinas)" },
  { sigla: "STJ", nome: "STJ" },
  { sigla: "TST", nome: "TST" },
];

// Formato CNJ (Resolução 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO
const CNJ_REGEX = /^(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})$/;

export function validarNumeroCnj(numero) {
  if (!numero) return false;
  return CNJ_REGEX.test(numero.replace(/\s/g, ""));
}

export function partesNumeroCnj(numero) {
  const limpo = (numero || "").replace(/\s/g, "");
  const match = limpo.match(CNJ_REGEX);
  if (!match) return null;
  const [, sequencial, dv, ano, segmento, tribunal, origem] = match;
  return { sequencial, dv, ano, segmento, tribunal, origem };
}

export function aliasDatajud(siglaTribunal) {
  return (siglaTribunal || "").toLowerCase().replace(/\s/g, "");
}

// Mapa "segmento.tribunal" (dígitos J e TR do número CNJ) -> sigla, só pros
// tribunais que estão na lista TRIBUNAIS acima. Segmento 8 = Justiça
// Estadual (TJ), 4 = Justiça Federal (TRF), 5 = Justiça do Trabalho
// (TRT/TST), 3 = STJ.
const MAPA_SEGMENTO_TRIBUNAL = {
  "3.00": "STJ",
  "4.01": "TRF1",
  "4.02": "TRF2",
  "4.03": "TRF3",
  "4.04": "TRF4",
  "4.05": "TRF5",
  "4.06": "TRF6",
  "5.00": "TST",
  "5.02": "TRT2",
  "5.15": "TRT15",
  "8.05": "TJBA",
  "8.06": "TJCE",
  "8.07": "TJDFT",
  "8.09": "TJGO",
  "8.13": "TJMG",
  "8.16": "TJPR",
  "8.17": "TJPE",
  "8.19": "TJRJ",
  "8.21": "TJRS",
  "8.24": "TJSC",
  "8.26": "TJSP",
};

// Lê o tribunal certo direto do número CNJ (segmento + código já estão no
// número, não precisa o usuário adivinhar/errar na lista). Devolve null se o
// número ainda não é válido ou se o tribunal não está na nossa lista curta.
export function detectarTribunal(numero) {
  const partes = partesNumeroCnj(numero);
  if (!partes) return null;
  return MAPA_SEGMENTO_TRIBUNAL[`${partes.segmento}.${partes.tribunal}`] || null;
}
