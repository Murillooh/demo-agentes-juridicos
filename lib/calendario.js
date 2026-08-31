// Grade de semanas (domingo-sábado) pro calendário mensal da agenda,
// incluindo os dias do mês anterior/seguinte que completam a 1ª/última linha.
export function montarGradeMes(ano, mesIndiceZero) {
  const primeiroDiaMes = new Date(ano, mesIndiceZero, 1);
  const ultimoDiaMes = new Date(ano, mesIndiceZero + 1, 0);

  const inicioGrade = new Date(primeiroDiaMes);
  inicioGrade.setDate(inicioGrade.getDate() - primeiroDiaMes.getDay());

  const fimGrade = new Date(ultimoDiaMes);
  fimGrade.setDate(fimGrade.getDate() + (6 - ultimoDiaMes.getDay()));

  const semanas = [];
  let semanaAtual = [];
  const cursor = new Date(inicioGrade);
  while (cursor <= fimGrade) {
    semanaAtual.push({ data: new Date(cursor), noMes: cursor.getMonth() === mesIndiceZero });
    if (semanaAtual.length === 7) {
      semanas.push(semanaAtual);
      semanaAtual = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return semanas;
}

export function formatarDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
