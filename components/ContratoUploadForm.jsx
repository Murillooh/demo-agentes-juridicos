"use client";
import { useFormState, useFormStatus } from "react-dom";
import { enviarContrato } from "../app/(app)/contratos/actions";

const ESTADO_INICIAL = { erro: "" };

function BotaoEnviar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Analisando… (pode levar até 1 minuto)" : "Enviar e analisar"}
    </button>
  );
}

export default function ContratoUploadForm() {
  const [estado, acao] = useFormState(enviarContrato, ESTADO_INICIAL);

  return (
    <div className="glass-panel" style={{ padding: "28px", maxWidth: "560px" }}>
      <form action={acao} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <label>
          Arquivo (PDF ou DOCX, até 15MB)
          <input type="file" name="arquivo" accept=".pdf,.docx" required />
        </label>
        {estado?.erro && <p className="erro">{estado.erro}</p>}
        <BotaoEnviar />
      </form>
      <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "16px", lineHeight: 1.5 }}>
        Contrato escaneado (sem camada de texto) não é lido pela IA nesta versão - precisaria de OCR, que ainda não
        existe aqui.
      </p>
    </div>
  );
}
