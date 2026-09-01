import Link from "next/link";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import { limparHtml } from "../../../lib/limpar-html";
import VerificarDiarioButton from "../../../components/VerificarDiarioButton";
import MarcarLidaButton from "../../../components/MarcarLidaButton";
import { Bell, Scale, BookOpen, Search, Link as LinkIcon } from "lucide-react";

// verificarAgora (Server Action chamada por VerificarDiarioButton) consulta
// o DJEN pra cada OAB do escritório - pode passar de 10s facilmente com
// várias OABs.
export const maxDuration = 300;

export default async function AtualizacoesPage({ searchParams }) {
  const supabase = criarClienteSupabaseServidor();
  await obterUsuario(supabase);

  const filtro = searchParams?.filtro === "nao-lidas" ? "nao-lidas" : "todas";

  // Busca sempre tudo (não filtrado no banco) - o filtro "Não lidas" é só um
  // recorte em JS da mesma lista, senão precisaria de 2 queries (uma pra
  // contar "todas" no resumo, outra filtrada pra exibir) só pra alternar
  // uma aba.
  const { data: atualizacoes } = await supabase
    .from("atualizacoes_diario")
    .select("id, tribunal, orgao, tipo_comunicacao, texto, data_disponibilizacao, lida, numero_processo, oabs(numero, estado_uf), peticoes(id, titulo)")
    .order("data_disponibilizacao", { ascending: false })
    .limit(100);

  // OABs do escritório inteiro (não só as do advogado logado - Diário
  // Oficial monitora todas, é por isso que RLS de "oabs" já libera ver as
  // do escritório todo, não só as próprias).
  const { data: oabsEscritorio } = await supabase.from("oabs").select("numero, estado_uf").order("estado_uf");

  const todas = atualizacoes || [];
  const naoLidas = todas.filter((a) => !a.lida).length;
  const listaExibida = filtro === "nao-lidas" ? todas.filter((a) => !a.lida) : todas;

  const contagemPorOab = (oabsEscritorio || []).map((oab) => ({
    ...oab,
    total: todas.filter((a) => a.oabs?.numero === oab.numero && a.oabs?.estado_uf === oab.estado_uf).length,
  }));

  return (
    <div style={{ maxWidth: "1400px", width: "100%", animation: "fadeIn 0.5s ease-out" }}>
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
          max-width: 700px;
          line-height: 1.5;
        }
        .atualizacao-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 24px 28px;
          background: var(--panel);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          gap: 24px;
          margin-bottom: 12px;
          transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .atualizacao-row::before {
          content: "";
          position: absolute;
          top: 0; left: 0; bottom: 0; width: 3px;
          background: var(--accent);
          transform: scaleY(0);
          transform-origin: center;
          transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
          border-radius: 4px 0 0 4px;
        }
        .atualizacao-row.nao-lida {
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, rgba(59, 130, 246, 0.01) 100%);
          border-color: rgba(59, 130, 246, 0.2);
        }
        .atualizacao-row.nao-lida::before {
          transform: scaleY(1);
        }
        .atualizacao-row:hover {
          background: rgba(255, 255, 255, 0.03);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
        }
        .atualizacao-row:hover::before {
          transform: scaleY(1);
        }
        .atualizacao-icon-bg {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 14px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-dim);
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        .atualizacao-row:hover .atualizacao-icon-bg {
          background: var(--accent-glow);
          color: var(--accent);
          border-color: rgba(59, 130, 246, 0.3);
          transform: scale(1.05);
        }
        .atualizacao-title {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 6px;
          transition: color 0.2s;
        }
        .atualizacao-row:hover .atualizacao-title {
          color: var(--accent);
        }
        .atualizacao-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          font-size: 0.8rem;
          color: var(--text-dim);
          margin-bottom: 12px;
        }
        .meta-dot {
          width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.2);
        }
        .badge-status {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .badge-nao-lida {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .texto-limpo {
          font-size: 0.95rem;
          color: var(--text-dim);
          line-height: 1.6;
          background: rgba(0,0,0,0.15);
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.02);
          margin-top: 12px;
        }
        .link-peticao {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--accent);
          background: var(--accent-glow);
          padding: 6px 14px;
          border-radius: 20px;
          text-decoration: none;
          margin-top: 12px;
          transition: all 0.2s ease;
        }
        .link-peticao:hover {
          background: rgba(59, 130, 246, 0.25);
          transform: translateX(2px);
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
        .filtro-abas {
          display: flex;
          gap: 6px;
          margin-bottom: 20px;
        }
        .filtro-aba {
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-dim);
          text-decoration: none;
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }
        .filtro-aba:hover {
          color: var(--text);
        }
        .filtro-aba.ativa {
          background: var(--accent-glow);
          color: var(--accent);
          border-color: rgba(59, 130, 246, 0.3);
        }
        .oab-monitorada {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: var(--panel-2);
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        .oab-monitorada + .oab-monitorada {
          margin-top: 8px;
        }
      `}} />

      <div className="header-bg" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "20px" }}>
        <div>
          <h1 className="titulo-pagina">Atualizações do Diário</h1>
          <p className="subtitulo-pagina">
            Publicações do Diário de Justiça Eletrônico Nacional (DJEN/CNJ) encontradas pelas OABs do escritório.
            {naoLidas > 0 && <strong style={{ color: "var(--accent)", marginLeft: "6px" }}>{naoLidas} não lida(s).</strong>}
          </p>
        </div>
        <div style={{ flexShrink: 0 }}>
          <VerificarDiarioButton />
        </div>
      </div>

      {!atualizacoes || atualizacoes.length === 0 ? (
        <div className="empty-state fade-in">
          <div className="empty-icon-wrapper">
            <Search size={48} strokeWidth={1} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.3rem", color: "var(--text)", marginBottom: "10px", fontWeight: 600 }}>Nenhuma atualização ainda</h3>
            <p style={{ color: "var(--text-dim)", maxWidth: "460px", margin: "0 auto", lineHeight: 1.5 }}>
              O sistema verifica automaticamente o Diário de Justiça Eletrônico Nacional (DJEN/CNJ) todos os dias. Você também pode verificar manualmente a qualquer momento clicando no botão acima.
            </p>
          </div>
        </div>
      ) : (
        <div className="agenda-layout">
        <div>
        <div className="filtro-abas">
          <Link href="/atualizacoes" className={`filtro-aba ${filtro === "todas" ? "ativa" : ""}`}>
            Todas ({todas.length})
          </Link>
          <Link href="/atualizacoes?filtro=nao-lidas" className={`filtro-aba ${filtro === "nao-lidas" ? "ativa" : ""}`}>
            Não lidas ({naoLidas})
          </Link>
        </div>

        {listaExibida.length === 0 ? (
          <div className="empty-state fade-in">
            <div className="empty-icon-wrapper">
              <Bell size={48} strokeWidth={1} />
            </div>
            <h3 style={{ fontSize: "1.15rem", color: "var(--text)", fontWeight: 600 }}>Tudo lido por aqui.</h3>
          </div>
        ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {listaExibida.map((a, index) => (
            <div
              key={a.id}
              className={`atualizacao-row ${!a.lida ? 'nao-lida' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div style={{ display: "flex", gap: "20px", flex: 1, minWidth: 0 }}>
                <div className="atualizacao-icon-bg">
                  <BookOpen size={22} strokeWidth={1.5} />
                </div>
                
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="atualizacao-meta">
                    {!a.lida && <span className="badge-status badge-nao-lida">Não lida</span>}
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Scale size={14} />
                      {a.tribunal}
                    </span>
                    <span className="meta-dot"></span>
                    <span>OAB {a.oabs?.numero}/{a.oabs?.estado_uf}</span>
                    <span className="meta-dot"></span>
                    <span>{new Date(`${a.data_disponibilizacao}T00:00:00`).toLocaleDateString("pt-BR")}</span>
                  </div>
                  
                  <h3 className="atualizacao-title">
                    {a.tipo_comunicacao || "Comunicação"} — {a.orgao}
                  </h3>
                  
                  <div className="texto-limpo">
                    {limparHtml(a.texto)}
                  </div>
                  
                  {a.peticoes?.titulo && (
                    <div style={{ marginTop: "12px" }}>
                      <Link href={`/peticoes/${a.peticoes.id}`} className="link-peticao">
                        <LinkIcon size={14} />
                        Vinculada à petição: {a.peticoes.titulo}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start" }}>
                {!a.lida && <MarcarLidaButton id={a.id} />}
              </div>
            </div>
          ))}
        </div>
        )}
        </div>

        <div>
          <div className="glass-panel" style={{ padding: "24px", marginBottom: "18px" }}>
            <h3 className="titulo-secao" style={{ marginBottom: "16px" }}>
              Resumo
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div className="oab-monitorada">
                <span>Total de atualizações</span>
                <span className="badge">{todas.length}</span>
              </div>
              <div className="oab-monitorada">
                <span>Não lidas</span>
                <span className="badge" style={naoLidas > 0 ? { background: "var(--accent-glow)", color: "var(--accent)" } : undefined}>
                  {naoLidas}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 className="titulo-secao" style={{ marginBottom: "4px" }}>
              OABs monitoradas
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "16px" }}>
              Diário Oficial verifica todo dia, por essas OABs do escritório.
            </p>
            {contagemPorOab.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.5 }}>
                Nenhuma OAB cadastrada ainda - sem ela não tem o que monitorar.
              </p>
            ) : (
              <div>
                {contagemPorOab.map((oab) => (
                  <div key={`${oab.numero}-${oab.estado_uf}`} className="oab-monitorada">
                    <span>
                      OAB/{oab.estado_uf} {oab.numero}
                    </span>
                    <span className="badge">{oab.total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
