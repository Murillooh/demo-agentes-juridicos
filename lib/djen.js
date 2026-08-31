// Cliente da API pública do Diário de Justiça Eletrônico Nacional (DJEN),
// CNJ, Resolução 455/2022. Sem autenticação, sem chave. Testado direto
// contra a API real antes de escrever isso - formato de resposta confirmado
// (não documentação lida de terceiro, chamada real feita e inspecionada).
//
// Fonte NACIONAL única - não existe "uma API por estado". A UF do advogado
// (oabs.estado_uf, já um campo próprio desde a Etapa 0) só entra como
// FILTRO da busca (ufOab=), não como troca de fonte/endpoint.
const BASE_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const TAMANHO_PAGINA = 40;

// Busca comunicações (intimações/publicações) pra uma OAB específica, desde
// uma data. Nunca lança - erro de rede/timeout vira { erro: true } pro job
// conseguir seguir pras outras OABs sem cair inteiro (requisito explícito
// da Etapa 4: indisponibilidade de uma fonte não pode derrubar as outras).
export async function buscarComunicacoesPorOab({ numeroOab, ufOab, desde }) {
  const params = new URLSearchParams({
    numeroOab: String(numeroOab),
    ufOab: String(ufOab).toUpperCase(),
    itensPorPagina: String(TAMANHO_PAGINA),
  });
  if (desde) params.set("dataDisponibilizacaoInicio", desde);

  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), 15000);

  try {
    const resposta = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: controlador.signal,
    });
    if (!resposta.ok) {
      return { erro: true, mensagem: `DJEN respondeu ${resposta.status}` };
    }
    const dados = await resposta.json();
    return { erro: false, itens: dados.items || [], total: dados.count || 0 };
  } catch (err) {
    return { erro: true, mensagem: err.name === "AbortError" ? "timeout" : "falha de conexão" };
  } finally {
    clearTimeout(timeoutId);
  }
}
