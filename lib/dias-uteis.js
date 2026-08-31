// Soma dias corridos ou úteis a partir de uma data-base (string "YYYY-MM-DD").
//
// AVISO IMPORTANTE: "dias úteis" aqui só pula sábado/domingo - NÃO existe
// calendário de feriado nenhum (nacional/estadual/municipal/forense) embutido.
// Perto de feriado, a data calculada pode estar errada. Isso precisa ficar
// visível pro advogado na tela (não é um detalhe de implementação pra
// esconder) - é exatamente o tipo de erro silencioso que essa etapa pediu
// pra evitar.
export function somarDias(dataBaseISO, quantidade, apenasUteis) {
  const data = new Date(`${dataBaseISO}T00:00:00`);
  if (!apenasUteis) {
    data.setDate(data.getDate() + quantidade);
    return data;
  }
  let restantes = quantidade;
  while (restantes > 0) {
    data.setDate(data.getDate() + 1);
    const diaSemana = data.getDay(); // 0 = domingo, 6 = sábado
    if (diaSemana !== 0 && diaSemana !== 6) restantes--;
  }
  return data;
}

export function formatarDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}
