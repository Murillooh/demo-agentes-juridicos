import "server-only";
import { randomUUID } from "crypto";
import { criarClienteSupabaseAdmin } from "./supabase/admin";
import { buscarProcessoNoDatajud } from "./datajud";
import { enfileirarNotificacao } from "./notificacoes/enfileirar";

// Roda com a service role key - mesmo padrão de lib/verificar-diario.js.
// Chamado a partir do mesmo cron diário do Diário Oficial (não um cron
// separado - Vercel Hobby rejeita o deploy inteiro se tiver mais de 2
// crons/schedule sub-diário, já bateu nisso uma vez nesse projeto).
export async function executarVerificacaoProcessos() {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return { erro: "Não configurado neste ambiente (falta SUPABASE_SERVICE_ROLE_KEY)." };

  const { data: processos, error } = await admin.from("processos_monitorados").select("*");
  if (error) return { erro: "Não foi possível carregar os processos acompanhados." };

  let sucesso = 0;
  let falha = 0;
  let mudou = 0;
  const agora = new Date().toISOString();

  for (const p of processos || []) {
    const resultado = await buscarProcessoNoDatajud(p.numero_cnj, p.tribunal);

    if (!resultado.configurado || resultado.erro || resultado.naoEncontrado) {
      falha++;
      if (resultado.erro) console.error(`[verificar-processos] ${p.numero_cnj}: ${resultado.erro}`);
      await admin.from("processos_monitorados").update({ ultima_verificacao: agora }).eq("id", p.id);
      continue; // indisponibilidade de 1 processo não pode derrubar os outros
    }

    const novaSituacao = resultado.processo.situacaoAtual;
    const ultimoAndamento = resultado.processo.andamentos?.[0];
    const mudouDeVerdade = novaSituacao && novaSituacao !== p.situacao_atual;

    await admin
      .from("processos_monitorados")
      .update({
        situacao_atual: novaSituacao || p.situacao_atual,
        ultimo_andamento_data: ultimoAndamento?.data ? converterDataBr(ultimoAndamento.data) : p.ultimo_andamento_data,
        ultima_verificacao: agora,
      })
      .eq("id", p.id);

    if (mudouDeVerdade) {
      mudou++;
      try {
        await enfileirarNotificacao({
          admin,
          escritorioId: p.escritorio_id,
          advogadoId: p.advogado_id,
          tipoEvento: "processo_atualizado",
          // uuid novo por mudança real (não o id do processo em si) - mesma
          // razão de peticao_fase na Etapa 6: senão a unique de dedup só
          // notificaria a 1ª mudança de cada processo pra sempre.
          eventoId: randomUUID(),
          titulo: "Novo andamento no processo acompanhado",
          mensagem: `${p.numero_cnj} (${p.tribunal}): ${novaSituacao}`,
        });
      } catch (err) {
        console.error(`[notificacoes] falha ao enfileirar processo_atualizado ${p.numero_cnj}`, err);
      }
    }

    sucesso++;
  }

  const resumo = { totalProcessos: (processos || []).length, sucesso, falha, mudou };
  console.log(`[verificar-processos] ${JSON.stringify(resumo)}`);
  return resumo;
}

function converterDataBr(dataBr) {
  const [dia, mes, ano] = String(dataBr).split("/");
  if (!dia || !mes || !ano) return null;
  return `${ano}-${mes}-${dia}`;
}
