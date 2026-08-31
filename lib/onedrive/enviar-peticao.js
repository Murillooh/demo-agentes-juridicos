import "server-only";
import { criarClienteSupabaseAdmin } from "../supabase/admin";
import { obterTokenValido, enviarArquivoOneDrive } from "./graph";
import { montarCaminhoPeticao } from "./caminho";
import { gerarPdfPeticao } from "../gerar-pdf-peticao";

// Best-effort: chamado a partir de moverFasePeticao quando a petição entra
// em Protocolo (board/actions.js), ou manualmente via "Tentar de novo" em
// /integracoes. NUNCA lança - falha de upload não pode derrubar o board
// nem desfazer o move de coluna (a petição continua existindo e mudada de
// fase mesmo se isso aqui falhar; requisito explícito da Etapa 7). Todo
// resultado (sucesso ou falha) fica registrado na própria petição -
// "jeito claro de tentar de novo" é literalmente reler esse estado.
export async function enviarPeticaoParaOneDrive(peticaoId) {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return;

  const { data: peticao } = await admin
    .from("peticoes")
    .select("id, titulo, area_direito, conteudo, escritorio_id, nome_cliente, onedrive_tentativas")
    .eq("id", peticaoId)
    .maybeSingle();
  if (!peticao) return;

  async function marcarFalha(erro) {
    await admin
      .from("peticoes")
      .update({
        onedrive_status: "falha",
        onedrive_erro: erro,
        onedrive_atualizado_em: new Date().toISOString(),
        onedrive_tentativas: (peticao.onedrive_tentativas || 0) + 1,
      })
      .eq("id", peticaoId);
  }

  const accessToken = await obterTokenValido(admin, peticao.escritorio_id);
  if (!accessToken) {
    await marcarFalha("OneDrive não conectado ou reconexão necessária. Veja Integrações.");
    return;
  }

  const { data: escritorio } = await admin
    .from("escritorios")
    .select("nome, logo_url")
    .eq("id", peticao.escritorio_id)
    .maybeSingle();

  let bytes;
  try {
    bytes = await gerarPdfPeticao({ peticao, escritorio });
  } catch (err) {
    await marcarFalha(`Falha ao gerar o PDF: ${err.message || "erro desconhecido"}`);
    return;
  }

  const caminho = montarCaminhoPeticao({
    nomeEscritorio: escritorio?.nome,
    nomeCliente: peticao.nome_cliente,
    titulo: peticao.titulo,
    peticaoId: peticao.id,
  });

  const resultado = await enviarArquivoOneDrive({ accessToken, caminho, bytes });
  const agora = new Date().toISOString();

  if (!resultado.sucesso) {
    await marcarFalha(resultado.erro);
    await admin
      .from("integracoes_onedrive")
      .update({ ultima_sincronizacao: agora, ultimo_erro: resultado.erro })
      .eq("escritorio_id", peticao.escritorio_id);
    return;
  }

  await admin
    .from("peticoes")
    .update({
      onedrive_status: "enviado",
      onedrive_caminho: caminho,
      onedrive_link: resultado.webUrl || null,
      onedrive_erro: null,
      onedrive_atualizado_em: agora,
      onedrive_tentativas: (peticao.onedrive_tentativas || 0) + 1,
    })
    .eq("id", peticaoId);

  await admin
    .from("integracoes_onedrive")
    .update({ ultima_sincronizacao: agora, ultimo_erro: null })
    .eq("escritorio_id", peticao.escritorio_id);
}
