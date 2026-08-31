"use client";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { gerarPeticao } from "../app/(app)/peticoes/actions";
import { AREAS_DIREITO } from "../lib/areas-direito";

const ESTADO_INICIAL = { erro: "" };

function BotaoGerar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Gerando com IA… (pode levar até 1 minuto)" : "Gerar minuta"}
    </button>
  );
}

export default function GerarPeticaoForm() {
  const [estado, acao] = useFormState(gerarPeticao, ESTADO_INICIAL);

  return (
    <div className="glass-panel" style={{ padding: "28px", maxWidth: "640px" }}>
      <form action={acao} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "14px" }}>
          <label>
            Área do direito
            <select name="areaDireito" required defaultValue="">
              <option value="" disabled>
                Selecione…
              </option>
              {AREAS_DIREITO.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>
          <label>
            Título da petição
            <input name="titulo" required placeholder='Ex.: "Petição inicial - João da Silva"' />
          </label>
        </div>
        <label>
          Descreva o caso (ou cole os dados do processo)
          <textarea
            name="descricaoCaso"
            required
            rows={10}
            placeholder="Fatos do caso, partes envolvidas, pedido, fundamentos que você já tem em mente…"
          />
        </label>

        {estado?.erro && (
          <div className="erro" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span>{estado.erro}</span>
            {estado.semReferencia && (
              <Link href="/peticoes-base" style={{ color: "var(--danger)", textDecoration: "underline", fontWeight: 600 }}>
                Ir pra Petições-base →
              </Link>
            )}
          </div>
        )}

        <BotaoGerar />
      </form>
      <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "16px", lineHeight: 1.5 }}>
        O texto gerado é sempre uma minuta — você revisa e ajusta no editor antes de considerar pronto.
      </p>
    </div>
  );
}
