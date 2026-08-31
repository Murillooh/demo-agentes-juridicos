import "server-only";
import { criarClienteSupabaseAdmin } from "./supabase/admin";
import { buscarComunicacoesPorOab } from "./djen";
import { enfileirarNotificacao } from "./notificacoes/enfileirar";

function soDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

// Roda com a service role key (mesmo padrão do provisionamento de
// escritório na Etapa 0) - o job varre OABs de todos os escritórios, não
// tem sessão de advogado nenhuma associada.
//
// apenasEscritorioId: usado pelo botão "Verificar agora" (advogado logado
// só reprocessa as OABs do próprio escritório, não o sistema inteiro).
// Sem esse parâmetro, roda pra todas as OABs cadastradas - é o que o cron
// da Vercel chama.
export async function executarVerificacaoDiario({ apenasEscritorioId } = {}) {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) {
    return { erro: "Não configurado neste ambiente (falta SUPABASE_SERVICE_ROLE_KEY)." };
  }

  const { data: todasOabs, error: erroOabs } = await admin
    .from("oabs")
    .select("id, numero, estado_uf, ultima_verificacao_diario, advogado_id, advogados(escritorio_id)");
  if (erroOabs) return { erro: "Não foi possível carregar as OABs." };

  const oabs = apenasEscritorioId
    ? (todasOabs || []).filter((o) => o.advogados?.escritorio_id === apenasEscritorioId)
    : todasOabs || [];

  let sucesso = 0;
  let falha = 0;
  let novas = 0;
  const agora = new Date().toISOString();

  // Cache do mapa numero_processo(só dígitos) -> peticao_id por escritório -
  // evita 1 query por item retornado, já que várias OABs do mesmo
  // escritório reusam o mesmo mapa.
  const mapasPeticoesPorEscritorio = new Map();
  async function obterMapaPeticoes(escritorioId) {
    if (mapasPeticoesPorEscritorio.has(escritorioId)) return mapasPeticoesPorEscritorio.get(escritorioId);
    const { data } = await admin
      .from("peticoes")
      .select("id, numero_processo")
      .eq("escritorio_id", escritorioId)
      .not("numero_processo", "is", null);
    const mapa = new Map((data || []).map((p) => [soDigitos(p.numero_processo), p.id]));
    mapasPeticoesPorEscritorio.set(escritorioId, mapa);
    return mapa;
  }

  for (const oab of oabs) {
    const escritorioId = oab.advogados?.escritorio_id;
    if (!escritorioId) {
      falha++;
      continue;
    }

    // 1ª verificação dessa OAB: olha os últimos 30 dias (senão perderia
    // publicação recente de antes do cadastro). Depois, só desde a última
    // vez com sucesso - é isso que torna o job incremental de verdade, não
    // só "não duplica por causa da unique constraint".
    const desde = oab.ultima_verificacao_diario
      ? oab.ultima_verificacao_diario.slice(0, 10)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const resultado = await buscarComunicacoesPorOab({ numeroOab: oab.numero, ufOab: oab.estado_uf, desde });

    if (resultado.erro) {
      falha++;
      console.error(`[verificar-diario] OAB ${oab.numero}/${oab.estado_uf}: ${resultado.mensagem}`);
      continue; // indisponibilidade dessa OAB não pode derrubar as outras
    }

    if (resultado.itens.length > 0) {
      const mapaPeticoes = await obterMapaPeticoes(escritorioId);
      const linhas = resultado.itens.map((item) => {
        const numeroLimpo = soDigitos(item.numero_processo);
        return {
          escritorio_id: escritorioId,
          oab_id: oab.id,
          id_comunicacao_djen: item.id,
          numero_processo: numeroLimpo || null,
          tribunal: item.siglaTribunal || null,
          orgao: item.nomeOrgao || null,
          tipo_comunicacao: item.tipoComunicacao || item.tipoDocumento || null,
          texto: item.texto || null,
          data_disponibilizacao: item.data_disponibilizacao,
          peticao_id: mapaPeticoes.get(numeroLimpo) || null,
        };
      });

      // ignoreDuplicates -> a idempotência de verdade: rodar 2x só insere
      // o que ainda não existe pra esse par (oab_id, id_comunicacao_djen).
      const { data: inseridas, error: erroInsert } = await admin
        .from("atualizacoes_diario")
        .upsert(linhas, { onConflict: "oab_id,id_comunicacao_djen", ignoreDuplicates: true })
        .select("id, tribunal, orgao, tipo_comunicacao, numero_processo");
      if (erroInsert) {
        falha++;
        console.error(`[verificar-diario] falha ao salvar OAB ${oab.numero}/${oab.estado_uf}: ${erroInsert.message}`);
        continue;
      }
      novas += inseridas?.length || 0;

      // Etapa 5 - notifica o dono da OAB (não da petição - a atualização
      // pode nem ter petição vinculada ainda). Igual ao trigger de prazo,
      // erro aqui nunca pode derrubar o job inteiro.
      for (const item of inseridas || []) {
        try {
          await enfileirarNotificacao({
            admin,
            escritorioId,
            advogadoId: oab.advogado_id,
            tipoEvento: "atualizacao_diario",
            eventoId: item.id,
            titulo: "Nova publicação no Diário Oficial",
            mensagem: `${item.tribunal || "Tribunal"} · ${item.orgao || ""} — ${item.tipo_comunicacao || "Comunicação"}${
              item.numero_processo ? ` (processo ${item.numero_processo})` : ""
            }.`,
          });
        } catch (err) {
          console.error(`[notificacoes] falha ao enfileirar atualizacao_diario ${item.id}`, err);
        }
      }
    }

    await admin.from("oabs").update({ ultima_verificacao_diario: agora }).eq("id", oab.id);
    sucesso++;
  }

  const resumo = { totalOabs: oabs.length, sucesso, falha, novas };
  console.log(`[verificar-diario] ${JSON.stringify(resumo)}`);
  return resumo;
}
