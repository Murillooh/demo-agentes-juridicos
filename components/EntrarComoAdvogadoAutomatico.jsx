"use client";
import { useEffect, useState } from "react";
import { entrarComoAdvogado } from "../app/admin/actions";

// app/admin/entrar/page.jsx (Server Component) não pode chamar
// entrarComoAdvogado() direto no render pra fazer o login automático -
// "cookies().set()" só é permitido dentro da action quando ela é chamada
// de verdade do lado client (form/clique/etc), não de um await solto
// durante o render de outro componente server (erro real visto:
// "Cookies can only be modified in a Server Action or Route Handler").
// Aqui a chamada sai do client (useEffect ao montar) - mesmo jeito que
// BotaoVerComoAdvogado já faz com sucesso, só que automático em vez de
// esperar um clique.
export default function EntrarComoAdvogadoAutomatico() {
  const [erro, setErro] = useState("");

  useEffect(() => {
    // Em caso de sucesso a action já faz redirect() no servidor - o
    // .then só chega a rodar quando ela devolve erro sem navegar.
    entrarComoAdvogado().then((resultado) => {
      if (resultado?.erro) setErro(resultado.erro);
    });
  }, []);

  if (!erro) {
    return (
      <main className="shell">
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "18px" }}>
          <svg className="animate-spin" width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: "var(--accent)" }}>
            <circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
            <path
              opacity="0.9"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <div>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", marginBottom: "6px" }}>Entrando como advogado…</h1>
            <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>Preparando o escritório de demonstração.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="card">
        <span className="badge">Erro</span>
        <h1 style={{ fontFamily: "var(--font-serif)", margin: "14px 0 6px" }}>Não foi possível entrar</h1>
        <p className="erro">{erro}</p>
        <p style={{ marginTop: "16px", fontSize: "14px" }}>
          <a href="/admin" style={{ color: "var(--accent)" }}>
            Ir pro painel admin →
          </a>
        </p>
      </div>
    </main>
  );
}
