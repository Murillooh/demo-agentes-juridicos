import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import MarcarNotificacaoLidaButton from "../../../components/MarcarNotificacaoLidaButton";

const ROTULO_STATUS = {
  pendente: { texto: "Enviando…", cor: "var(--text-dim)" },
  enviada: { texto: "Enviada", cor: "var(--accent)" },
  falha: { texto: "Falhou", cor: "var(--danger)" },
};

const ROTULO_CANAL = { email: "E-mail", whatsapp: "WhatsApp" };

export default async function NotificacoesPage() {
  const supabase = criarClienteSupabaseServidor();
  await obterUsuario(supabase);

  const { data: notificacoes } = await supabase
    .from("notificacoes")
    .select("id, tipo_evento, canal, destino, titulo, mensagem, status, tentativas, erro_detalhe, enviada_em, lida, criado_em")
    .order("criado_em", { ascending: false })
    .limit(100);

  const naoLidas = (notificacoes || []).filter((n) => n.status === "enviada" && !n.lida).length;

  return (
    <>
      <h1 className="titulo-pagina">Central de Notificações</h1>
      <p className="subtitulo-pagina">
        Histórico de envios por e-mail e WhatsApp de prazos e atualizações do Diário Oficial.{" "}
        {naoLidas > 0 && <strong style={{ color: "var(--accent)" }}>{naoLidas} não lida(s).</strong>}
      </p>

      {!notificacoes || notificacoes.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
          Nenhuma notificação ainda. Elas aparecem aqui quando um prazo é identificado ou uma atualização do Diário chega.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "820px" }}>
          {notificacoes.map((n) => {
            const status = ROTULO_STATUS[n.status] || ROTULO_STATUS.pendente;
            return (
              <div
                key={n.id}
                className="glass-panel"
                style={{ padding: "18px 22px", borderColor: n.lida ? undefined : "var(--accent)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
                      {!n.lida && n.status === "enviada" && <span className="badge">Não lida</span>}
                      <span style={{ fontSize: "12px", fontWeight: 700, color: status.cor }}>{status.texto}</span>
                      <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                        {ROTULO_CANAL[n.canal] || n.canal} · {n.destino} ·{" "}
                        {new Date(n.criado_em).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p style={{ fontWeight: 600 }}>{n.titulo}</p>
                    <p style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "4px" }}>{n.mensagem}</p>
                    {n.status === "falha" && n.erro_detalhe && (
                      <p style={{ fontSize: "11px", color: "var(--danger)", marginTop: "6px" }}>
                        {n.tentativas} tentativa(s) — {n.erro_detalhe}
                      </p>
                    )}
                  </div>
                  {n.status === "enviada" && !n.lida && <MarcarNotificacaoLidaButton id={n.id} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
