import "server-only";
import { criarClienteSupabaseAdmin } from "../supabase/admin";
import { obterTokenValido, obterOuCriarPasta, criarArquivo, atualizarArquivo } from "./graph";
import { gerarPdfPeticao } from "../gerar-pdf-peticao";

function sanitizar(texto) {
  return String(texto || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

// Convenção de pasta: {Escritório}/Clientes/{Cliente}/Peticoes/{arquivo}.pdf
// - mesma convenção da versão OneDrive, só que resolvida nível a nível (ver
// obterOuCriarPasta em graph.js) em vez de endereço por path direto.
// pasta_raiz_id/pasta_clientes_id ficam cacheados em integracoes_googledrive
// (só resolvidos 1x por escritório); a pasta do cliente e "Peticoes" dentro
// dela são resolvidas a cada envio (muda conforme a petição).
export async function enviarPeticaoParaGoogleDrive(peticaoId) {
  const admin = criarClienteSupabaseAdmin();
  if (!admin) return;

  const { data: peticao } = await admin
    .from("peticoes")
    .select("id, titulo, area_direito, conteudo, escritorio_id, nome_cliente, googledrive_arquivo_id, googledrive_tentativas")
    .eq("id", peticaoId)
    .maybeSingle();
  if (!peticao) return;

  async function marcarFalha(erro) {
    await admin
      .from("peticoes")
      .update({
        googledrive_status: "falha",
        googledrive_erro: erro,
        googledrive_atualizado_em: new Date().toISOString(),
        googledrive_tentativas: (peticao.googledrive_tentativas || 0) + 1,
      })
      .eq("id", peticaoId);
  }

  const accessToken = await obterTokenValido(admin, peticao.escritorio_id);
  if (!accessToken) {
    await marcarFalha("Google Drive não conectado ou reconexão necessária. Veja Integrações.");
    return;
  }

  try {
    const { data: escritorio } = await admin.from("escritorios").select("nome, logo_url").eq("id", peticao.escritorio_id).maybeSingle();
    const { data: integracao } = await admin
      .from("integracoes_googledrive")
      .select("pasta_raiz_id, pasta_clientes_id")
      .eq("escritorio_id", peticao.escritorio_id)
      .maybeSingle();

    let raizId = integracao?.pasta_raiz_id;
    if (!raizId) {
      raizId = await obterOuCriarPasta({ accessToken, nome: sanitizar(escritorio?.nome) || "Escritorio", paiId: "root" });
      await admin.from("integracoes_googledrive").update({ pasta_raiz_id: raizId }).eq("escritorio_id", peticao.escritorio_id);
    }

    let clientesId = integracao?.pasta_clientes_id;
    if (!clientesId) {
      clientesId = await obterOuCriarPasta({ accessToken, nome: "Clientes", paiId: raizId });
      await admin.from("integracoes_googledrive").update({ pasta_clientes_id: clientesId }).eq("escritorio_id", peticao.escritorio_id);
    }

    const clienteId = await obterOuCriarPasta({ accessToken, nome: sanitizar(peticao.nome_cliente) || "Sem cliente definido", paiId: clientesId });
    const peticoesId = await obterOuCriarPasta({ accessToken, nome: "Peticoes", paiId: clienteId });

    const bytes = await gerarPdfPeticao({ peticao, escritorio });
    const nomeArquivo = `${sanitizar(peticao.titulo) || "Peticao"} (${peticao.id.slice(0, 8)}).pdf`;

    // Já existe um arquivo desse envio anterior? Atualiza o conteúdo dele
    // em vez de criar um novo (Drive permite nome duplicado numa pasta,
    // sem isso cada retry viraria uma cópia extra).
    const resultado = peticao.googledrive_arquivo_id
      ? await atualizarArquivo({ accessToken, arquivoId: peticao.googledrive_arquivo_id, bytes })
      : await criarArquivo({ accessToken, nome: nomeArquivo, paiId: peticoesId, bytes });

    const agora = new Date().toISOString();

    if (!resultado.sucesso) {
      await marcarFalha(resultado.erro);
      await admin.from("integracoes_googledrive").update({ ultima_sincronizacao: agora, ultimo_erro: resultado.erro }).eq("escritorio_id", peticao.escritorio_id);
      return;
    }

    await admin
      .from("peticoes")
      .update({
        googledrive_status: "enviado",
        googledrive_arquivo_id: resultado.arquivoId,
        googledrive_link: resultado.webViewLink || null,
        googledrive_erro: null,
        googledrive_atualizado_em: agora,
        googledrive_tentativas: (peticao.googledrive_tentativas || 0) + 1,
      })
      .eq("id", peticaoId);

    await admin.from("integracoes_googledrive").update({ ultima_sincronizacao: agora, ultimo_erro: null }).eq("escritorio_id", peticao.escritorio_id);
  } catch (err) {
    // obterOuCriarPasta lança em vez de devolver {sucesso:false} (ver
    // graph.js) - captura aqui pra nunca deixar exceção subir e derrubar
    // quem chamou (moverFasePeticao).
    await marcarFalha(err.message || "Falha ao resolver as pastas no Google Drive.");
  }
}
