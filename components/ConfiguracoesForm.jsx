"use client";
import { useFormState, useFormStatus } from "react-dom";
import { atualizarEscritorio } from "../app/(app)/configuracoes/actions";

const ESTADO_INICIAL = { erro: "", sucesso: "" };

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Salvando…" : "Salvar"}
    </button>
  );
}

export default function ConfiguracoesForm({ nome, logoUrl }) {
  const [estado, acao] = useFormState(atualizarEscritorio, ESTADO_INICIAL);

  return (
    <div className="glass-panel" style={{ padding: "28px", maxWidth: "520px" }}>
      <h3 className="titulo-secao" style={{ marginBottom: "20px" }}>
        Identidade do escritório
      </h3>
      <form action={acao} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <label>
          Nome do escritório
          <input name="nome" defaultValue={nome} required />
        </label>
        <label>
          URL do logo
          <input name="logoUrl" defaultValue={logoUrl || ""} placeholder="https://…/logo.png" />
        </label>
        {logoUrl && (
          <div>
            <label>Pré-visualização</label>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="Logo do escritório"
              style={{ maxWidth: "160px", maxHeight: "80px", objectFit: "contain", background: "#fff", padding: "8px", borderRadius: "6px" }}
            />
          </div>
        )}
        {estado?.erro && <p className="erro">{estado.erro}</p>}
        {estado?.sucesso && <p className="info">{estado.sucesso}</p>}
        <BotaoSalvar />
      </form>
      <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "16px", lineHeight: 1.5 }}>
        Esse logo aparece no topo das petições exportadas em PDF. Cole a URL de uma imagem já hospedada
        (upload de arquivo é feature de uma próxima etapa).
      </p>
    </div>
  );
}
