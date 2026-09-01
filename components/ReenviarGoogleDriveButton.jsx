"use client";
import { reenviarPeticaoGoogleDrive } from "../app/(app)/integracoes/actions";

export default function ReenviarGoogleDriveButton({ id }) {
  return (
    <form action={reenviarPeticaoGoogleDrive.bind(null, id)}>
      <button type="submit" className="secundario" style={{ padding: "4px 10px", fontSize: "12px" }}>
        Tentar de novo
      </button>
    </form>
  );
}
