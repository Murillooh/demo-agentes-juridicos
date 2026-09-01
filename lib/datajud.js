import "server-only";
import { aliasDatajud } from "./cnj";

// Portado de demo-agentes-juridicos (Etapa 10) - já era genérico/puro,
// tratamento de resposta real do DataJud validado naquele projeto (não é
// suposição de documentação, foi confirmado contra resposta real da API).

// DataJud devolve datas em dois formatos: ISO 8601 nos movimentos, e um
// formato compacto AAAAMMDDHHmmss em dataAjuizamento.
export function formatarDataDatajud(valor) {
  if (!valor) return "";
  if (/^\d{14}$/.test(valor)) {
    const dia = valor.slice(6, 8);
    const mes = valor.slice(4, 6);
    const ano = valor.slice(0, 4);
    return `${dia}/${mes}/${ano}`;
  }
  const d = new Date(valor);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("pt-BR");
  }
  return valor;
}

// "nome" sozinho às vezes é só um fragmento genérico do código da Tabela
// Processual Unificada. "complementosTabelados" carrega o detalhe
// específico quando o tribunal preenche isso, mas com o campo invertido do
// que parece: "descricao" é a CHAVE interna e "nome" é o VALOR legível -
// confirmado com resposta real do DataJud. Usar "nome", não "descricao".
function descreverMovimento(m) {
  const complementos = (m.complementosTabelados || []).map((c) => c.nome).filter(Boolean);
  return [m.nome, ...complementos].filter(Boolean).join(" — ") || JSON.stringify(m);
}

function mapearHitParaProcesso(hit, tribunal, numeroCnjFallback) {
  const movimentosOrdenados = [...(hit.movimentos || [])].sort(
    (a, b) => new Date(b.dataHora || 0) - new Date(a.dataHora || 0)
  );

  return {
    numeroCnj: hit.numeroProcesso || numeroCnjFallback || "",
    classe: hit.classe?.nome || "não informado",
    assunto: hit.assuntos?.[0]?.nome || "não informado",
    tribunal,
    orgaoJulgador: hit.orgaoJulgador?.nome || "não informado",
    dataDistribuicao: formatarDataDatajud(hit.dataAjuizamento) || "não informado",
    situacaoAtual: movimentosOrdenados[0] ? descreverMovimento(movimentosOrdenados[0]) : "não informado",
    andamentos: movimentosOrdenados.slice(0, 15).map((m) => ({
      data: formatarDataDatajud(m.dataHora),
      descricao: descreverMovimento(m),
      codigo: m.codigo ?? null,
    })),
    fonte: "DataJud/CNJ",
    atualizadoEm: new Date().toISOString(),
  };
}

// Busca um processo no DataJud. Usada tanto pela busca avulsa quanto pelo
// acompanhamento periódico (lib/verificar-processos.js). Devolve sempre um
// objeto com "configurado" - nunca lança, quem chama só olha o formato do
// retorno.
export async function buscarProcessoNoDatajud(numeroCnj, tribunal) {
  const apiKey = process.env.DATAJUD_API_KEY;

  if (!apiKey) {
    return {
      configurado: false,
      mensagem: "Busca de processo ainda não configurada neste ambiente (falta DATAJUD_API_KEY).",
    };
  }

  const alias = aliasDatajud(tribunal);
  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`;
  const numeroLimpo = numeroCnj.replace(/\D/g, "");

  const controlador = new AbortController();
  const timeoutId = setTimeout(() => controlador.abort(), 9000);

  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `APIKey ${apiKey}` },
      body: JSON.stringify({ query: { match: { numeroProcesso: numeroLimpo } } }),
      signal: controlador.signal,
    });

    if (!resposta.ok) {
      const texto = await resposta.text();
      return {
        configurado: true,
        erro: `O DataJud respondeu ${resposta.status}. Confira o tribunal selecionado.`,
        detalhe: texto.slice(0, 500),
      };
    }

    const dados = await resposta.json();
    const hits = (dados?.hits?.hits || []).map((h) => h._source).filter(Boolean);

    if (hits.length === 0) {
      return {
        configurado: true,
        naoEncontrado: true,
        mensagem:
          "Não encontramos esse processo nesse tribunal via DataJud. Pode estar em segredo de justiça, ter sido distribuído há pouco tempo (o DataJud tem defasagem de dados) ou o tribunal selecionado pode não ser o correto.",
      };
    }

    // Processo com recurso vem como um hit POR GRAU (mesmo numeroProcesso,
    // movimentos diferentes) - junta os movimentos de todos os graus e usa
    // o cabeçalho do grau mais atualizado, senão "situação atual" mostra o
    // último evento da 1ª instância mesmo já em grau de recurso.
    const hitMaisRecente = hits.reduce((mais, atual) =>
      new Date(atual.dataHoraUltimaAtualizacao || 0) > new Date(mais.dataHoraUltimaAtualizacao || 0) ? atual : mais
    );
    const hitCombinado = { ...hitMaisRecente, movimentos: hits.flatMap((h) => h.movimentos || []) };

    return { configurado: true, processo: mapearHitParaProcesso(hitCombinado, tribunal, numeroCnj) };
  } catch (err) {
    if (err.name === "AbortError") {
      return { configurado: true, erro: "O DataJud demorou demais pra responder. Tente novamente em instantes." };
    }
    return { configurado: true, erro: "Falha ao conectar com o DataJud. Tente novamente em instantes." };
  } finally {
    clearTimeout(timeoutId);
  }
}
