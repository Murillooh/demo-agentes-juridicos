"use server";

import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import { criarClienteSupabaseAdmin } from "../../../lib/supabase/admin";
import { enfileirarNotificacao } from "../../../lib/notificacoes/enfileirar";

const FASES = ["criacao", "revisao", "protocolo"];
const CAMPO_RESPONSAVEL = { revisao: "responsavel_revisao_id", protocolo: "responsavel_protocolo_id" };
const TITULO_FASE = { revisao: "Revisão", protocolo: "Protocolo" };

// Arrastar o cartão já move visualmente na hora (otimista, no client) - essa
// action é quem persiste de verdade. Devolve erro explícito pro client
// desfazer o otimismo se a escrita falhar (RLS, sessão expirada etc).
export async function moverFasePeticao(id, novaFase) {
  if (!FASES.includes(novaFase)) return { erro: "Fase inválida." };

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  const { data: peticaoAtual } = await supabase
    .from("peticoes")
    .select("titulo, fase_kanban, escritorio_id, responsavel_revisao_id, responsavel_protocolo_id")
    .eq("id", id)
    .maybeSingle();
  if (!peticaoAtual) return { erro: "Petição não encontrada." };
  if (peticaoAtual.fase_kanban === novaFase) return { sucesso: true };

  const { error: erroUpdate } = await supabase
    .from("peticoes")
    .update({ fase_kanban: novaFase, fase_atualizada_em: new Date().toISOString() })
    .eq("id", id);
  if (erroUpdate) return { erro: "Não foi possível mover a petição." };

  // Log de transição + notificação são best-effort a partir daqui - a
  // petição JÁ moveu de fase (é o que importa pro board), erro abaixo só
  // fica no console, não desfaz o move.
  const { data: transicao, error: erroTransicao } = await supabase
    .from("peticoes_transicoes")
    .insert({
      peticao_id: id,
      escritorio_id: peticaoAtual.escritorio_id,
      fase_anterior: peticaoAtual.fase_kanban,
      fase_nova: novaFase,
      movido_por: user.id,
    })
    .select("id")
    .single();

  // Só notifica ao ENTRAR em revisão/protocolo - voltar pra criação não tem
  // "responsável" definido (advogado_id já é o dono da criação desde o
  // início, mandar de volta não é um evento que precise de aviso separado).
  const campoResponsavel = CAMPO_RESPONSAVEL[novaFase];
  const responsavelId = campoResponsavel ? peticaoAtual[campoResponsavel] : null;

  if (!erroTransicao && responsavelId) {
    try {
      const admin = criarClienteSupabaseAdmin();
      await enfileirarNotificacao({
        admin,
        escritorioId: peticaoAtual.escritorio_id,
        advogadoId: responsavelId,
        tipoEvento: "peticao_fase",
        eventoId: transicao.id,
        titulo: `Petição pronta para ${TITULO_FASE[novaFase]}`,
        mensagem: `"${peticaoAtual.titulo}" foi movida para ${TITULO_FASE[novaFase]}.`,
      });
    } catch (err) {
      console.error("[notificacoes] falha ao enfileirar peticao_fase", err);
    }
  } else if (erroTransicao) {
    console.error("[board] falha ao registrar transição", erroTransicao);
  }

  return { sucesso: true };
}

// Quem vai revisar/protocolar - definido enquanto a petição ainda está na
// fase anterior, pra já existir responsável no momento em que ela entrar na
// próxima (é o que moverFasePeticao lê pra notificar).
export async function definirResponsavel(id, fase, advogadoId) {
  const coluna = CAMPO_RESPONSAVEL[fase];
  if (!coluna) return { erro: "Fase inválida." };

  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);
  if (!supabase || !user) return { erro: "Sessão expirada." };

  const { error } = await supabase
    .from("peticoes")
    .update({ [coluna]: advogadoId || null })
    .eq("id", id);
  if (error) return { erro: "Não foi possível salvar o responsável." };

  return { sucesso: true };
}
