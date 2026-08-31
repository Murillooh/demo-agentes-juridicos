"use client";
import { marcarNotificacaoLida } from "../app/(app)/notificacoes/actions";

export default function MarcarNotificacaoLidaButton({ id }) {
  return (
    <form action={marcarNotificacaoLida.bind(null, id)}>
      <button type="submit" className="secundario" style={{ padding: "4px 10px", fontSize: "12px" }}>
        Marcar como lida
      </button>
    </form>
  );
}
