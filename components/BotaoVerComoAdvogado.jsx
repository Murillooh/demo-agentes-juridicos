"use client";
import { useState } from "react";
import { entrarComoAdvogado } from "../app/admin/actions";

// "Ver como advogado" (Etapa 12) - manda o admin pro /dashboard como uma
// conta fixa de visualização, dentro do sandbox de demonstração já
// populado (petições/prazos/contratos de exemplo - dá pra clicar em tudo
// de verdade). Chama a Server Action direto (sem <form>) porque não tem
// campo nenhum pra preencher, só um clique.
export default function BotaoVerComoAdvogado() {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar() {
    setErro("");
    setCarregando(true);
    // Em caso de sucesso a action já faz redirect() no servidor - essa
    // linha só chega a rodar quando ela devolve erro sem navegar.
    const resultado = await entrarComoAdvogado();
    setCarregando(false);
    if (resultado?.erro) setErro(resultado.erro);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
      <button type="button" className="secundario" onClick={entrar} disabled={carregando}>
        {carregando ? "Entrando…" : "Ver como advogado"}
      </button>
      {erro && (
        <p className="erro" style={{ fontSize: "12px", maxWidth: "260px", textAlign: "right" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
