import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import DesconectarOneDriveButton from "../../../components/DesconectarOneDriveButton";
import ReenviarOneDriveButton from "../../../components/ReenviarOneDriveButton";

export default async function IntegracoesPage({ searchParams }) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);

  const { data: advogado } = await supabase.from("advogados").select("escritorio_id").eq("id", user.id).maybeSingle();

  const { data: integracao } = await supabase
    .from("integracoes_onedrive")
    .select("email_conta_ms, status, ultima_sincronizacao, ultimo_erro")
    .eq("escritorio_id", advogado?.escritorio_id)
    .maybeSingle();

  const { data: peticoesComUpload } = await supabase
    .from("peticoes")
    .select("id, titulo, nome_cliente, onedrive_status, onedrive_erro, onedrive_link, onedrive_atualizado_em")
    .not("onedrive_status", "is", null)
    .order("onedrive_atualizado_em", { ascending: false })
    .limit(30);

  const conectado = !!integracao;
  const ativa = conectado && integracao.status === "ativa";

  return (
    <>
      <h1 className="titulo-pagina">Integrações</h1>
      <p className="subtitulo-pagina">
        OneDrive - petições que chegam em Protocolo no Board são salvas automaticamente na pasta do cliente.
      </p>

      {searchParams?.erro && (
        <p className="erro" style={{ marginBottom: "20px" }}>
          {searchParams.erro}
        </p>
      )}
      {searchParams?.conectado && (
        <p className="info" style={{ marginBottom: "20px" }}>
          Conectado ao OneDrive com sucesso.
        </p>
      )}

      <div className="glass-panel" style={{ padding: "28px", maxWidth: "560px", marginBottom: "28px" }}>
        <h3 className="titulo-secao" style={{ marginBottom: "16px" }}>
          OneDrive
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
          {conectado && integracao.email_conta_ms && (
            <span style={{ fontSize: "13px", color: "var(--text-dim)" }}>{integracao.email_conta_ms}</span>
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
            <a href="/api/integracoes/onedrive/conectar">
              <button type="button">{conectado ? "Reconectar" : "Conectar ao OneDrive"}</button>
            </a>
          ) : (
            <DesconectarOneDriveButton />
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
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "820px" }}>
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
                  {p.onedrive_atualizado_em ? new Date(p.onedrive_atualizado_em).toLocaleString("pt-BR") : "—"}
                </p>
                {p.onedrive_status === "falha" && p.onedrive_erro && (
                  <p style={{ fontSize: "11px", color: "var(--danger)", marginTop: "4px" }}>{p.onedrive_erro}</p>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                <span
                  className="badge"
                  style={{
                    background:
                      p.onedrive_status === "enviado" ? "var(--accent-glow)" : p.onedrive_status === "falha" ? "var(--danger-glow)" : "rgba(255,255,255,0.06)",
                    color: p.onedrive_status === "enviado" ? "var(--accent)" : p.onedrive_status === "falha" ? "var(--danger)" : "var(--text-dim)",
                  }}
                >
                  {p.onedrive_status === "enviado" ? "Enviada" : p.onedrive_status === "falha" ? "Falhou" : "Enviando…"}
                </span>
                {p.onedrive_status === "enviado" && p.onedrive_link && (
                  <a href={p.onedrive_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "var(--accent)" }}>
                    Abrir
                  </a>
                )}
                {p.onedrive_status === "falha" && <ReenviarOneDriveButton id={p.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
