"use client";
import { useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { entrar } from "../app/login/actions";

const ESTADO_INICIAL = { erro: "" };

function BotaoEnviar({ children }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-accent hover:bg-accent-hover text-bg font-bold py-3.5 px-8 rounded-xl transition-all hover:shadow-[0_0_20px_var(--accent-glow)] hover:-translate-y-0.5 w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-bg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Aguarde...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

function IconeOlho({ aberto }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3.2"
        stroke="currentColor"
        strokeWidth="1.8"
        className="olho-pupila"
        style={{ transform: aberto ? "scale(1)" : "scale(0)" }}
      />
      <line
        x1="3"
        y1="3"
        x2="21"
        y2="21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        pathLength="1"
        className="olho-risco"
        style={{ strokeDasharray: 1, strokeDashoffset: aberto ? 1 : 0 }}
      />
    </svg>
  );
}

function CampoSenha({ value, onChange }) {
  const [mostrar, setMostrar] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em]">Senha</label>
      <div className="relative">
        <input
          className="premium-input w-full pr-12"
          name="senha"
          type={mostrar ? "text" : "password"}
          required
          minLength={6}
          placeholder="Sua senha"
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="botao-olho"
          onClick={() => setMostrar((v) => !v)}
          tabIndex={-1}
          aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={mostrar}
        >
          <IconeOlho aberto={mostrar} />
        </button>
      </div>
    </div>
  );
}

export default function LoginForm() {
  const [estado, acao] = useFormState(entrar, ESTADO_INICIAL);
  const [senha, setSenha] = useState("");

  return (
    <div className="flex flex-col w-full">
      <form className="flex flex-col gap-5" action={acao}>
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-text-dim uppercase tracking-[0.2em]">E-mail</label>
          <input className="premium-input w-full" name="email" type="email" required placeholder="voce@escritorio.com.br" />
        </div>

        <CampoSenha value={senha} onChange={(e) => setSenha(e.target.value)} />

        {estado?.erro && (
          <div className="p-3 mt-2 rounded-lg border border-danger/30 bg-danger/10 text-danger text-xs font-medium text-center">
            {estado.erro}
          </div>
        )}

        <div className="mt-4">
          <BotaoEnviar>Entrar</BotaoEnviar>
        </div>
      </form>

      <p className="mt-6 text-xs text-text-dim text-center">
        Escritório novo?{" "}
        <Link href="/onboarding" className="text-accent hover:underline">
          Criar cadastro
        </Link>
      </p>
    </div>
  );
}
