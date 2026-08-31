"use client";
import { useFormState, useFormStatus } from "react-dom";
import { trocarSenha } from "../app/trocar-senha/actions";

const ESTADO_INICIAL = { erro: "" };

function BotaoTrocar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ width: "100%" }}>
      {pending ? "Salvando…" : "Trocar senha e continuar"}
    </button>
  );
}

export default function TrocarSenhaForm() {
  const [estado, acao] = useFormState(trocarSenha, ESTADO_INICIAL);

  return (
    <form action={acao} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <label>
        Nova senha
        <input name="novaSenha" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" />
      </label>
      <label>
        Confirmar nova senha
        <input name="confirmarSenha" type="password" required minLength={8} placeholder="Repita a senha" />
      </label>
      {estado?.erro && <p className="erro">{estado.erro}</p>}
      <BotaoTrocar />
    </form>
  );
}
