"use client";
import { removerReuniao } from "../app/(app)/agenda/actions";

export default function RemoverReuniaoButton({ id }) {
  return (
    <form action={removerReuniao.bind(null, id)}>
      <button type="submit" className="secundario" style={{ padding: "4px 10px", fontSize: "12px" }}>
        Remover
      </button>
    </form>
  );
}
