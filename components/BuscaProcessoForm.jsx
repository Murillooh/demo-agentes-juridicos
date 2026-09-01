"use client";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { buscarProcesso, acompanharProcesso } from "../app/(app)/processos/actions";
import { TRIBUNAIS, detectarTribunal, validarNumeroCnj, formatarNumeroCnj } from "../lib/cnj";

const ESTADO_INICIAL = { erro: "" };

function BotaoBuscar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Consultando o DataJud…" : "Buscar processo"}
    </button>
  );
}

export default function BuscaProcessoForm() {
  const [estado, acao] = useFormState(buscarProcesso, ESTADO_INICIAL);
  const [numero, setNumero] = useState("");
  const [tribunal, setTribunal] = useState("");
  const [acompanhando, setAcompanhando] = useState(false);
  const [msgAcompanhar, setMsgAcompanhar] = useState("");

  function aoMudarNumero(valor) {
    setNumero(valor);
    if (validarNumeroCnj(valor)) {
      const detectado = detectarTribunal(valor);
      if (detectado) setTribunal(detectado);
    }
  }

  async function adicionarAcompanhamento() {
    if (!estado?.processo) return;
    setAcompanhando(true);
    const resposta = await acompanharProcesso(estado.numeroCnj, estado.tribunal, estado.processo.situacaoAtual);
    setAcompanhando(false);
    setMsgAcompanhar(resposta.erro || "Processo em acompanhamento - avisamos quando mudar.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="glass-panel" style={{ padding: "28px" }}>
        <form action={acao} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <label style={{ flex: "2 1 320px" }}>
              Número do processo (CNJ)
              <input
                name="numeroCnj"
                value={numero}
                onChange={(e) => aoMudarNumero(e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                required
              />
            </label>
            <label style={{ flex: "1 1 220px" }}>
              Tribunal
              <select name="tribunal" value={tribunal} onChange={(e) => setTribunal(e.target.value)} required>
                <option value="">Selecione…</option>
                {TRIBUNAIS.map((t) => (
                  <option key={t.sigla} value={t.sigla}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ flex: "0 0 auto" }}>
              <BotaoBuscar />
            </div>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-dim)" }}>
            Detectamos o tribunal sozinhos a partir do número CNJ quando possível - confira antes de buscar.
          </p>
          {estado?.erro && <p className="erro">{estado.erro}</p>}
        </form>
      </div>

      {estado?.processo && (
        <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "22px", marginBottom: "6px" }}>
                {formatarNumeroCnj(estado.processo.numeroCnj)}
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-dim)" }}>
                {estado.processo.classe} · {estado.processo.tribunal} · {estado.processo.orgaoJulgador}
              </p>
            </div>
            <button type="button" className="secundario" onClick={adicionarAcompanhamento} disabled={acompanhando}>
              {acompanhando ? "Adicionando…" : "Acompanhar automaticamente"}
            </button>
          </div>

          <div className="processo-info-grade">
            <div className="processo-info-item">
              <label>Assunto</label>
              <p>{estado.processo.assunto}</p>
            </div>
            <div className="processo-info-item">
              <label>Distribuído em</label>
              <p>{estado.processo.dataDistribuicao}</p>
            </div>
            <div className="processo-info-item">
              <label>Situação atual</label>
              <span className="processo-situacao-badge">{estado.processo.situacaoAtual}</span>
            </div>
          </div>

          {msgAcompanhar && <p className="info">{msgAcompanhar}</p>}

          <div>
            <h4 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "14px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Andamentos recentes
            </h4>
            <div className="andamentos-linha">
              {estado.processo.andamentos.map((a, i) => (
                <div key={i} className="andamento-item">
                  <span className="andamento-data">{a.data}</span>
                  <p style={{ marginTop: "2px" }}>{a.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
