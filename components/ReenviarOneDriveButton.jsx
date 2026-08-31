"use client";
import { reenviarPeticaoOneDrive } from "../app/(app)/integracoes/actions";

export default function ReenviarOneDriveButton({ id }) {
  return (
    <form action={reenviarPeticaoOneDrive.bind(null, id)}>
      <button type="submit" className="secundario" style={{ padding: "4px 10px", fontSize: "12px" }}>
        Tentar de novo
      </button>
    </form>
  );
}
