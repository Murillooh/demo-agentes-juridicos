"use client";
import { marcarLida } from "../app/(app)/atualizacoes/actions";

export default function MarcarLidaButton({ id }) {
  return (
    <form action={marcarLida.bind(null, id)}>
      <button type="submit" className="secundario" style={{ padding: "4px 10px", fontSize: "12px" }}>
        Marcar como lida
      </button>
    </form>
  );
}
