"use client";
import { removerAcompanhamento } from "../app/(app)/processos/actions";

export default function RemoverAcompanhamentoButton({ id }) {
  return (
    <form action={removerAcompanhamento.bind(null, id)}>
      <button type="submit" className="secundario" style={{ padding: "4px 10px", fontSize: "12px" }}>
        Remover
      </button>
    </form>
  );
}
