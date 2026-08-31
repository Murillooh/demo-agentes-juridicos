"use client";
import { useFormState, useFormStatus } from "react-dom";
import { entrar } from "../app/login/actions";

const ESTADO_INICIAL = { erro: "" };

function BotaoEntrar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ width: "100%" }}>
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export default function LoginForm() {
  const [estado, acao] = useFormState(entrar, ESTADO_INICIAL);

  return (
    <form action={acao} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <label>
        E-mail
        <input name="email" type="email" required placeholder="voce@escritorio.com.br" />
      </label>
      <label>
        Senha
        <input name="senha" type="password" required placeholder="Sua senha" />
      </label>
      {estado?.erro && <p className="erro">{estado.erro}</p>}
      <BotaoEntrar />
    </form>
  );
}
