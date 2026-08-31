"use client";
import { useState } from "react";
import Link from "next/link";
import { criarAcessoDemo } from "../app/demo/actions";

export default function DemoAcessoForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null); // { email, senhaTemporaria, avisoEmail }

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.set("nome", nome);
      formData.set("email", email);
      const resposta = await criarAcessoDemo(null, formData);
      if (resposta.erro) {
        setErro(resposta.erro);
      } else {
        setResultado(resposta);
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="info" style={{ background: "var(--accent-glow)", padding: "14px", borderRadius: "8px" }}>
          {resultado.avisoEmail ? resultado.avisoEmail : "Acesso criado! Enviamos as instruções pro seu e-mail."}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label>E-mail</label>
            <input value={resultado.email} readOnly />
          </div>
          <div>
            <label>Senha temporária</label>
            <input value={resultado.senhaTemporaria} readOnly style={{ fontFamily: "monospace", letterSpacing: "0.05em" }} />
          </div>
        </div>
        <p style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.5 }}>
          No primeiro login, o sistema pede pra trocar essa senha. Você entra num escritório de demonstração já com
          petições, prazos e contratos de exemplo.
        </p>
        <Link href="/">
          <button type="button" style={{ width: "100%" }}>
            Ir para o login
          </button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div>
        <label>Seu nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Nome completo" />
      </div>
      <div>
        <label>Seu e-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="voce@escritorio.com.br"
        />
      </div>
      {erro && <p className="erro">{erro}</p>}
      <button type="submit" disabled={enviando} style={{ width: "100%" }}>
        {enviando ? "Criando acesso…" : "Criar acesso demo"}
      </button>
    </form>
  );
}
