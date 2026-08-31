"use client";
import { useState } from "react";
import { verificarAgora } from "../app/(app)/atualizacoes/actions";

export default function VerificarDiarioButton() {
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState(null);

  async function executar() {
    setCarregando(true);
    setResultado(null);
    const r = await verificarAgora();
    setCarregando(false);
    setResultado(r);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
      <button type="button" onClick={executar} disabled={carregando}>
        {carregando ? "Consultando o Diário…" : "Verificar agora"}
      </button>
      {resultado?.erro && <p className="erro">{resultado.erro}</p>}
      {resultado && !resultado.erro && (
        <p className="info">
          {resultado.totalOabs} OAB(s) consultada(s) · {resultado.sucesso} ok · {resultado.falha} falha(s) ·{" "}
          {resultado.novas} atualização(ões) nova(s).
        </p>
      )}
    </div>
  );
}
