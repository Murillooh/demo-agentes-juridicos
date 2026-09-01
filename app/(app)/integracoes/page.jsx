import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import DesconectarGoogleDriveButton from "../../../components/DesconectarGoogleDriveButton";
import ReenviarGoogleDriveButton from "../../../components/ReenviarGoogleDriveButton";

export default async function IntegracoesPage({ searchParams }) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);

  const { data: advogado } = await supabase.from("advogados").select("escritorio_id").eq("id", user.id).maybeSingle();

  const { data: integracao } = await supabase
    .from("integracoes_googledrive")
    .select("email_conta_google, status, ultima_sincronizacao, ultimo_erro")
    .eq("escritorio_id", advogado?.escritorio_id)
    .maybeSingle();

  const { data: peticoesComUpload } = await supabase
    .from("peticoes")
    .select("id, titulo, nome_cliente, googledrive_status, googledrive_erro, googledrive_link, googledrive_atualizado_em")
    .not("googledrive_status", "is", null)
    .order("googledrive_atualizado_em", { ascending: false })
    .limit(30);

  const conectado = !!integracao;
  const ativa = conectado && integracao.status === "ativa";

  return (
    <>
      <h1 className="titulo-pagina">Integrações</h1>
      <p className="subtitulo-pagina">
        Google Drive - petições que chegam em Protocolo no Board são salvas automaticamente na pasta do cliente.
      </p>

      {searchParams?.erro && (
        <p className="erro" style={{ marginBottom: "20px" }}>
          {searchParams.erro}
        </p>
      )}
      {searchParams?.conectado && (
        <p className="info" style={{ marginBottom: "20px" }}>
          Conectado ao Google Drive com sucesso.
        </p>
      )}

      <div className="glass-panel" style={{ padding: "28px", marginBottom: "28px" }}>
        <h3 className="titulo-secao" style={{ marginBottom: "16px" }}>
          Google Drive
        </h3>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
          <span
            className="badge"
            style={{
              background: ativa ? "var(--accent-glow)" : "var(--danger-glow)",
              color: ativa ? "var(--accent)" : "var(--danger)",
            }}
          >
            {!conectado ? "Desconectado" : ativa ? "Conectado" : "Reconexão necessária"}
          </span>
          {conectado && integracao.email_conta_google && (
            <span style={{ fontSize: "13px", color: "var(--text-dim)" }}>{integracao.email_conta_google}</span>
          )}
        </div>

        <p style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "18px", lineHeight: 1.6 }}>
          {integracao?.ultima_sincronizacao
            ? `Última sincronização: ${new Date(integracao.ultima_sincronizacao).toLocaleString("pt-BR")}`
            : "Ainda não houve nenhum envio."}
          {!ativa && integracao?.ultimo_erro && (
            <>
              <br />
              <span style={{ color: "var(--danger)" }}>{integracao.ultimo_erro}</span>
            </>
          )}
        </p>

        <div style={{ display: "flex", gap: "12px" }}>
          {!ativa ? (
            <a href="/api/integracoes/googledrive/conectar">
              <button type="button">{conectado ? "Reconectar" : "Conectar ao Google Drive"}</button>
            </a>
          ) : (
            <DesconectarGoogleDriveButton />
          )}
        </div>
      </div>

      <h3 className="titulo-secao" style={{ marginBottom: "16px" }}>
        Envios recentes
      </h3>
      {!peticoesComUpload || peticoesComUpload.length === 0 ? (
        <div className="glass-panel" style={{ padding: "32px", textAlign: "center", color: "var(--text-dim)" }}>
          Nenhuma petição enviada ainda. Acontece automaticamente quando uma petição chega em Protocolo no Board.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {peticoesComUpload.map((p) => (
            <div
              key={p.id}
              className="glass-panel"
              style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}
            >
              <div style={{ minWidth: 0 }}>
                <strong>{p.titulo}</strong>
                <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>
                  {p.nome_cliente || "Sem cliente definido"} ·{" "}
                  {p.googledrive_atualizado_em ? new Date(p.googledrive_atualizado_em).toLocaleString("pt-BR") : "—"}
                </p>
                {p.googledrive_status === "falha" && p.googledrive_erro && (
                  <p style={{ fontSize: "11px", color: "var(--danger)", marginTop: "4px" }}>{p.googledrive_erro}</p>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                <span
                  className="badge"
                  style={{
                    background:
                      p.googledrive_status === "enviado" ? "var(--accent-glow)" : p.googledrive_status === "falha" ? "var(--danger-glow)" : "rgba(255,255,255,0.06)",
                    color: p.googledrive_status === "enviado" ? "var(--accent)" : p.googledrive_status === "falha" ? "var(--danger)" : "var(--text-dim)",
                  }}
                >
                  {p.googledrive_status === "enviado" ? "Enviada" : p.googledrive_status === "falha" ? "Falhou" : "Enviando…"}
                </span>
                {p.googledrive_status === "enviado" && p.googledrive_link && (
                  <a href={p.googledrive_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "var(--accent)" }}>
                    Abrir
                  </a>
                )}
                {p.googledrive_status === "falha" && <ReenviarGoogleDriveButton id={p.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
