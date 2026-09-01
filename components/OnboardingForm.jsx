"use client";
import { useState } from "react";
import Link from "next/link";
import { criarEscritorio } from "../app/onboarding/actions";

function novaLinhaOab() {
  return { numero: "", estadoUf: "" };
}

export default function OnboardingForm() {
  const [nomeEscritorio, setNomeEscritorio] = useState("");
  const [nomeAdvogado, setNomeAdvogado] = useState("");
  const [email, setEmail] = useState("");
  const [oabs, setOabs] = useState([novaLinhaOab()]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null); // { email, senhaTemporaria, avisoOab? }

  function atualizarOab(indice, campo, valor) {
    setOabs((atuais) => atuais.map((o, i) => (i === indice ? { ...o, [campo]: valor } : o)));
  }

  function adicionarOab() {
    setOabs((atuais) => [...atuais, novaLinhaOab()]);
  }

  function removerOab(indice) {
    setOabs((atuais) => atuais.filter((_, i) => i !== indice));
  }

  async function enviar(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const resposta = await criarEscritorio({ nomeEscritorio, nomeAdvogado, email, oabs });
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
          Escritório criado. Essas credenciais só aparecem uma vez — anote ou copie agora.
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
        {resultado.avisoOab && <p className="erro">{resultado.avisoOab}</p>}
        <p style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.5 }}>
          No primeiro login, o sistema pede pra trocar essa senha. Seu acesso também precisa ser aprovado antes de
          liberar - você vai ver uma tela de espera até isso acontecer.
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
    <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <label>Nome do escritório</label>
        <input
          value={nomeEscritorio}
          onChange={(e) => setNomeEscritorio(e.target.value)}
          required
          placeholder="Ex.: Silva & Associados Advocacia"
        />
      </div>

      <div className="grade-campos grade-campos-1-1">
        <div>
          <label>Seu nome</label>
          <input value={nomeAdvogado} onChange={(e) => setNomeAdvogado(e.target.value)} required placeholder="Nome completo" />
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
      </div>

      <div>
        <label style={{ marginBottom: "10px" }}>OABs (uma por estado)</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {oabs.map((oab, i) => (
            <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                placeholder="Número da OAB"
                value={oab.numero}
                onChange={(e) => atualizarOab(i, "numero", e.target.value)}
                required
                style={{ flex: 2 }}
              />
              <input
                placeholder="UF"
                maxLength={2}
                value={oab.estadoUf}
                onChange={(e) => atualizarOab(i, "estadoUf", e.target.value.toUpperCase())}
                required
                style={{ flex: 1, textTransform: "uppercase" }}
              />
              {oabs.length > 1 && (
                <button type="button" className="secundario" onClick={() => removerOab(i)} style={{ flexShrink: 0 }}>
                  Remover
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="secundario" onClick={adicionarOab} style={{ marginTop: "10px" }}>
          + Adicionar outra OAB
        </button>
        {oabs.length > 1 && (
          <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "8px" }}>
            A primeira da lista fica marcada como principal.
          </p>
        )}
      </div>

      {erro && <p className="erro">{erro}</p>}

      <button type="submit" disabled={enviando} style={{ width: "100%" }}>
        {enviando ? "Criando…" : "Criar escritório"}
      </button>
    </form>
  );
}
