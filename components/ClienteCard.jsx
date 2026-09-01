"use client";
import { formatarVistoPorUltimo, estaOnline } from "../lib/tempo";
import { TELAS } from "../lib/permissoes";

// Card compacto de 1 cliente já aprovado - clique abre ClienteModal com
// tudo que antes ficava espalhado inline (logo, cor, telas). O card em si
// só mostra o essencial pra bater o olho: quem é, se tá online, quantas
// telas liberadas.
export default function ClienteCard({ conta, onClick }) {
  const online = estaOnline(conta.ultimo_acesso);
  const inicial = (conta.escritorios?.nome || conta.nome || "?").charAt(0).toUpperCase();
  const totalTelas = conta.permissoes === null ? TELAS.length : conta.permissoes.length;
  const logoUrl = conta.escritorios?.logo_url;

  return (
    <button type="button" onClick={onClick} className="glass-panel cliente-card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", minWidth: 0 }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            style={{ width: "44px", height: "44px", borderRadius: "10px", objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "var(--accent-glow)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {inicial}
          </div>
        )}
        {/* Nome do escritório + responsável + e-mail juntos - antes só o
            e-mail diferenciava 2 cards do mesmo escritório (mesmo logo,
            mesmo nome), ficavam parecendo clones. */}
        <div style={{ minWidth: 0 }}>
          <strong
            title={conta.escritorios?.nome}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              color: "var(--text)",
              lineHeight: 1.3,
            }}
          >
            {conta.escritorios?.nome}
          </strong>
          <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {conta.nome}
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-dim)", opacity: 0.7, marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {conta.email}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: online ? "var(--accent)" : "var(--text-dim)" }}>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: online ? "var(--accent)" : "var(--text-dim)",
              boxShadow: online ? "0 0 6px var(--accent)" : "none",
            }}
          />
          {formatarVistoPorUltimo(conta.ultimo_acesso)}
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
          {totalTelas}/{TELAS.length} telas
        </span>
      </div>
    </button>
  );
}
