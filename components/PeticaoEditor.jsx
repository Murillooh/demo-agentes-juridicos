"use client";
import { useState } from "react";
import { salvarPeticao, finalizarPeticao, salvarNumeroProcesso } from "../app/(app)/peticoes/actions";

export default function PeticaoEditor({ peticao, escritorio }) {
  const [conteudo, setConteudo] = useState(peticao.conteudo);
  const [status, setStatus] = useState(peticao.status);
  const [numeroProcesso, setNumeroProcesso] = useState(peticao.numero_processo || "");
  const [salvando, setSalvando] = useState(false);
  const [salvandoNumero, setSalvandoNumero] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const sujo = conteudo !== peticao.conteudo;
  const numeroSujo = numeroProcesso !== (peticao.numero_processo || "");

  async function salvarNumero() {
    setSalvandoNumero(true);
    const resposta = await salvarNumeroProcesso(peticao.id, numeroProcesso);
    setSalvandoNumero(false);
    if (resposta?.erro) {
      setErro(resposta.erro);
    } else {
      peticao.numero_processo = numeroProcesso;
    }
  }

  async function salvar() {
    setErro("");
    setMensagem("");
    setSalvando(true);
    const resposta = await salvarPeticao(peticao.id, conteudo);
    setSalvando(false);
    if (resposta?.erro) {
      setErro(resposta.erro);
    } else {
      setMensagem("Salvo.");
      peticao.conteudo = conteudo; // sincroniza a referência local - "sujo" volta a false
      setTimeout(() => setMensagem(""), 2500);
    }
  }

  async function finalizar() {
    if (sujo) await salvar();
    setFinalizando(true);
    const resposta = await finalizarPeticao(peticao.id);
    setFinalizando(false);
    if (resposta?.erro) {
      setErro(resposta.erro);
    } else {
      setStatus("finalizada");
    }
  }

  // A rota de PDF lê o conteúdo salvo no banco - se tiver edição não salva,
  // salva primeiro (senão o PDF sai desatualizado sem o usuário perceber).
  async function exportarPdf() {
    if (sujo) await salvar();
    window.open(`/api/peticoes/${peticao.id}/pdf`, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "820px" }}>
      <div
        className="info"
        style={{
          background: "var(--accent-glow)",
          padding: "12px 16px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        ⚠️ Minuta gerada por IA — revise com atenção antes de usar. Nunca é produto final automático.
      </div>

      <div
        className="glass-panel"
        style={{ padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {escritorio?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={escritorio.logo_url}
              alt={escritorio.nome}
              style={{ maxWidth: "72px", maxHeight: "48px", objectFit: "contain", background: "#fff", padding: "4px", borderRadius: "4px" }}
            />
          )}
          <div>
            <strong style={{ display: "block" }}>{escritorio?.nome}</strong>
            <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>{peticao.area_direito}</span>
          </div>
        </div>
        <span className="badge" style={{ background: status === "finalizada" ? "var(--accent-glow)" : "rgba(255,255,255,0.06)" }}>
          {status === "finalizada" ? "Finalizada" : "Rascunho"}
        </span>
      </div>

      <label>
        Número do processo (após protocolar)
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <input
            value={numeroProcesso}
            onChange={(e) => setNumeroProcesso(e.target.value)}
            placeholder="0000000-00.0000.0.00.0000"
            style={{ flex: 1 }}
          />
          <button type="button" className="secundario" onClick={salvarNumero} disabled={salvandoNumero || !numeroSujo}>
            {salvandoNumero ? "Salvando…" : "Salvar número"}
          </button>
        </div>
      </label>
      <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "-10px" }}>
        Preenchido, permite vincular automaticamente publicações do Diário Oficial a essa petição.
      </p>

      <label>
        Conteúdo
        <textarea
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
          rows={26}
          style={{ fontFamily: "monospace", fontSize: "13px", lineHeight: 1.6 }}
        />
      </label>

      {erro && <p className="erro">{erro}</p>}
      {mensagem && <p className="info">{mensagem}</p>}

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button type="button" onClick={salvar} disabled={salvando || !sujo}>
          {salvando ? "Salvando…" : sujo ? "Salvar alterações" : "Salvo"}
        </button>
        <button type="button" className="secundario" onClick={finalizar} disabled={finalizando || status === "finalizada"}>
          {finalizando ? "Finalizando…" : status === "finalizada" ? "Já finalizada" : "Finalizar"}
        </button>
        <button type="button" className="secundario" onClick={exportarPdf} disabled={salvando}>
          Exportar PDF
        </button>
      </div>
    </div>
  );
}
