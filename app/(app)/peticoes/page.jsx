import Link from "next/link";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import { Plus, FileText, CheckCircle2, Clock, ChevronRight, Search } from "lucide-react";

export default async function PeticoesPage() {
  const supabase = criarClienteSupabaseServidor();
  await obterUsuario(supabase);

  const { data: peticoes } = await supabase
    .from("peticoes")
    .select("id, titulo, area_direito, status, criado_em, atualizado_em, advogados!advogado_id(nome)")
    .order("criado_em", { ascending: false });

  return (
    <div style={{ width: "100%", animation: "fadeIn 0.5s ease-out" }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .header-bg {
          position: relative;
          margin-bottom: 40px;
          padding-bottom: 24px;
        }
        .header-bg::after {
          content: "";
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%);
        }
        .titulo-pagina {
          font-size: 2.2rem;
          font-weight: 700;
          margin-bottom: 8px;
          background: linear-gradient(135deg, #fff 0%, #93a2bd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
        }
        .subtitulo-pagina {
          font-size: 1.05rem;
          color: var(--text-dim);
          max-width: 600px;
        }
        .btn-novo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 28px;
          font-size: 0.95rem;
          font-weight: 600;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--accent), #1d4ed8);
          color: white;
          box-shadow: 0 4px 20px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2);
          transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
          border: none;
          cursor: pointer;
        }
        .btn-novo:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.3);
        }
        .peticao-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 28px;
          background: var(--panel);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          text-decoration: none;
          color: inherit;
          gap: 24px;
          margin-bottom: 12px;
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .peticao-row::before {
          content: "";
          position: absolute;
          top: 0; left: 0; bottom: 0; width: 3px;
          background: var(--accent);
          transform: scaleY(0);
          transform-origin: center;
          transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
          border-radius: 4px 0 0 4px;
        }
        .peticao-row:hover {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-3px) scale(1.005);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
        }
        .peticao-row:hover::before {
          transform: scaleY(1);
        }
        .peticao-icon-bg {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-dim);
          transition: all 0.3s ease;
        }
        .peticao-row:hover .peticao-icon-bg {
          background: var(--accent-glow);
          color: var(--accent);
          border-color: rgba(59, 130, 246, 0.3);
          transform: scale(1.05) rotate(-2deg);
        }
        .peticao-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 8px;
          transition: color 0.2s;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .peticao-row:hover .peticao-title {
          color: var(--accent);
        }
        .peticao-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px;
          font-size: 0.85rem;
          color: var(--text-dim);
        }
        .meta-dot {
          width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.2);
        }
        .badge-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .badge-finalizada {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        .badge-rascunho {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.25);
        }
        .chevron-icon {
          color: var(--text-dim);
          transition: all 0.3s ease;
          background: rgba(255,255,255,0.03);
          padding: 8px;
          border-radius: 10px;
        }
        .peticao-row:hover .chevron-icon {
          color: var(--accent);
          background: var(--accent-glow);
          transform: translateX(4px);
        }
        .empty-state {
          padding: 80px 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          background: linear-gradient(180deg, var(--panel) 0%, rgba(18, 27, 46, 0.4) 100%);
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 20px;
        }
        .empty-icon-wrapper {
          background: rgba(255,255,255,0.02);
          padding: 24px;
          border-radius: 50%;
          color: var(--text-dim);
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: inset 0 4px 20px rgba(0,0,0,0.2);
        }
      `}} />

      <div className="header-bg" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "20px" }}>
        <div>
          <h1 className="titulo-pagina">Petições</h1>
          <p className="subtitulo-pagina">Histórico de petições geradas neste escritório.</p>
        </div>
        <Link href="/peticoes/nova" style={{ textDecoration: 'none' }}>
          <button type="button" className="btn-novo">
            <Plus size={18} strokeWidth={2.5} />
            Nova petição
          </button>
        </Link>
      </div>

      {!peticoes || peticoes.length === 0 ? (
        <div className="empty-state fade-in">
          <div className="empty-icon-wrapper">
            <Search size={48} strokeWidth={1} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.3rem", color: "var(--text)", marginBottom: "10px", fontWeight: 600 }}>Nenhuma petição encontrada</h3>
            <p style={{ color: "var(--text-dim)", maxWidth: "420px", margin: "0 auto", lineHeight: 1.5 }}>
              Comece criando sua primeira petição usando nossos modelos automatizados baseados em IA. É rápido e prático.
            </p>
          </div>
          <Link href="/peticoes/nova" style={{ textDecoration: 'none', marginTop: "16px" }}>
             <button type="button" className="btn-novo" style={{ padding: "10px 24px", fontSize: "0.9rem" }}>
               <Plus size={16} strokeWidth={2.5}/> Criar Primeira Petição
             </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {peticoes.map((p, index) => {
            const isFinalizada = p.status === "finalizada";
            return (
              <Link
                key={p.id}
                href={`/peticoes/${p.id}`}
                className="peticao-row"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "24px", flex: 1, minWidth: 0 }}>
                  <div className="peticao-icon-bg">
                    <FileText size={24} strokeWidth={1.5} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 className="peticao-title">
                      {p.titulo}
                    </h3>
                    <div className="peticao-meta">
                      <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text)" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--accent)" }} />
                        {p.area_direito}
                      </span>
                      <span className="meta-dot"></span>
                      <span>{p.advogados?.nome}</span>
                      <span className="meta-dot"></span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} />
                        {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "32px", flexShrink: 0 }}>
                  <span className={`badge-status ${isFinalizada ? 'badge-finalizada' : 'badge-rascunho'}`}>
                    {isFinalizada ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <FileText size={14} strokeWidth={2.5} />}
                    {isFinalizada ? "Finalizada" : "Rascunho"}
                  </span>
                  
                  <div className="chevron-icon">
                    <ChevronRight size={18} strokeWidth={2} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
