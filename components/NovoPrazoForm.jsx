"use client";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { identificarPrazo, criarPrazoManual } from "../app/(app)/prazos/actions";

const ESTADO_INICIAL = { erro: "" };

function BotaoIdentificar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Analisando com IA…" : "Identificar prazo"}
    </button>
  );
}

function BotaoCriarManual() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Criando…" : "Criar prazo mesmo assim"}
    </button>
  );
}

export default function NovoPrazoForm({ peticoes }) {
  const [estadoIdentificar, acaoIdentificar] = useFormState(identificarPrazo, ESTADO_INICIAL);
  const [estadoManual, acaoManual] = useFormState(criarPrazoManual, ESTADO_INICIAL);
  const [dataDespacho, setDataDespacho] = useState(new Date().toISOString().slice(0, 10));

  const mostrarFallback = estadoIdentificar?.naoIdentificado;

  if (mostrarFallback) {
    return (
      <div className="glass-panel" style={{ padding: "28px", maxWidth: "640px" }}>
        <div className="erro" style={{ marginBottom: "20px" }}>
          {estadoIdentificar.aviso}
        </div>
        <form action={acaoManual} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input type="hidden" name="peticaoId" value={estadoIdentificar.peticaoId} />
          <input type="hidden" name="despachoTexto" value={estadoIdentificar.despachoTexto} />
          <input type="hidden" name="dataDespacho" value={estadoIdentificar.dataDespacho} />

          <label>
            Despacho colado (referência)
            <textarea defaultValue={estadoIdentificar.despachoTexto} rows={4} disabled />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" }}>
            <label>
              Descrição do prazo
              <input name="descricaoPrazo" required placeholder='Ex.: "Contestação"' />
            </label>
            <label>
              Quantidade de dias
              <input name="quantidadeDias" type="number" min="1" required />
            </label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" name="diasUteis" style={{ width: "auto" }} />
            <span style={{ textTransform: "none", fontSize: "13px" }}>Dias úteis (não corridos)</span>
          </label>
          <p style={{ fontSize: "12px", color: "var(--text-dim)" }}>
            Data do despacho: {new Date(`${estadoIdentificar.dataDespacho}T00:00:00`).toLocaleDateString("pt-BR")}
          </p>

          {estadoManual?.erro && <p className="erro">{estadoManual.erro}</p>}
          <BotaoCriarManual />
        </form>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: "28px", maxWidth: "640px" }}>
      <form action={acaoIdentificar} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "14px" }}>
          <label>
            Petição / processo de origem
            <select name="peticaoId" required defaultValue="">
              <option value="" disabled>
                Selecione…
              </option>
              {peticoes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.titulo}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data do despacho
            <input
              name="dataDespacho"
              type="date"
              required
              value={dataDespacho}
              onChange={(e) => setDataDespacho(e.target.value)}
            />
          </label>
        </div>
        <label>
          Texto do despacho
          <textarea name="despachoTexto" required rows={7} placeholder="Cole aqui o texto do despacho…" />
        </label>
        {estadoIdentificar?.erro && <p className="erro">{estadoIdentificar.erro}</p>}
        <BotaoIdentificar />
      </form>
      <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "16px", lineHeight: 1.5 }}>
        Cálculo de dias úteis pula só sábado/domingo — não considera feriado nacional, estadual ou
        forense. Confira a data perto de feriado.
      </p>
    </div>
  );
}
