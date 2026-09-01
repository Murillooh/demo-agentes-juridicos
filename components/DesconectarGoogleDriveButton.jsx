"use client";
import { desconectarGoogleDrive } from "../app/(app)/integracoes/actions";

export default function DesconectarGoogleDriveButton() {
  return (
    <form action={desconectarGoogleDrive}>
      <button type="submit" className="secundario">
        Desconectar
      </button>
    </form>
  );
}
