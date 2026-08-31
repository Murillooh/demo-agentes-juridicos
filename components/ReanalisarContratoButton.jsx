"use client";
import { reanalisarContrato } from "../app/(app)/contratos/actions";

export default function ReanalisarContratoButton({ id, rotulo = "Tentar de novo" }) {
  return (
    <form action={reanalisarContrato.bind(null, id)}>
      <button type="submit" className="secundario">
        {rotulo}
      </button>
    </form>
  );
}
