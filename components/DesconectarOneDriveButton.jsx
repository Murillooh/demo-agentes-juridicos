"use client";
import { desconectarOneDrive } from "../app/(app)/integracoes/actions";

export default function DesconectarOneDriveButton() {
  return (
    <form action={desconectarOneDrive}>
      <button type="submit" className="secundario">
        Desconectar
      </button>
    </form>
  );
}
