"use client";
import { useState } from "react";
import { voltarParaAdmin } from "../app/admin/actions";

// Só aparece em Configurações pra quem está logado como a conta de
// visualização (ver souPreviewAdmin) - restaura a sessão de admin
// guardada por entrarComoAdvogado (COOKIE_SESSAO_ADMIN_ORIGINAL), sem
// pedir senha de novo.
export default function BotaoVoltarAdmin() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function voltar() {
    setErro("");
    setCarregando(true);
    // Em caso de sucesso a action já faz redirect() no servidor - essa
    // linha só chega a rodar quando ela devolve erro sem navegar.
    const resultado = await voltarParaAdmin();
    setCarregando(false);
    if (resultado?.erro) setErro(resultado.erro);
  }

  return (
    <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "10px", alignItems: "flex-start" }}>
      <span className="badge">Modo visualização</span>
      <p style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.5 }}>
        Você está vendo o sistema como um advogado (conta de demonstração). Volte pro painel do administrador quando terminar.
      </p>
      <button type="button" onClick={voltar} disabled={carregando}>
        {carregando ? "Voltando…" : "Painel do administrador"}
      </button>
      {erro && <p className="erro" style={{ fontSize: "12px" }}>{erro}</p>}
    </div>
  );
}
