"use client";
import { useEffect, useState } from "react";
import TourBoasVindas from "./TourBoasVindas";
import { marcarTourVisto } from "../app/(app)/dashboard/actions";

const chaveLocal = (advogadoId) => `tour-visto:${advogadoId}`;

// Abre o tour sozinho no primeiro login (advogados.tour_visto = false) e
// grava tour_visto = true ao fechar. Depois disso o tour só reaparece se
// o advogado clicar no botão "Ver tour de boas-vindas" abaixo - aí o
// fechamento é só local, sem mexer no banco de novo.
//
// Fecha na hora, sem esperar o servidor confirmar - se esperasse, um
// refresh no meio do caminho (ou qualquer soluço de rede) cancelava a
// gravação e o tour voltava a aparecer no reload seguinte, mesmo já tendo
// sido fechado. E marca num localStorage local como reforço: mesmo que a
// gravação no banco atrase ou falhe, esse navegador não mostra de novo.
export default function BotaoVerTour({ tourVisto, advogadoId }) {
  const [aberto, setAberto] = useState(!tourVisto);

  useEffect(() => {
    if (tourVisto) return;
    try {
      if (localStorage.getItem(chaveLocal(advogadoId)) === "1") setAberto(false);
    } catch {
      // localStorage bloqueado (modo privado etc.) - sem problema, o banco continua sendo a fonte de verdade.
    }
  }, [tourVisto, advogadoId]);

  function fecharPrimeiraVez() {
    setAberto(false);
    try {
      localStorage.setItem(chaveLocal(advogadoId), "1");
    } catch {
      // idem acima
    }
    marcarTourVisto().catch((erro) => console.error("Falha ao gravar tour_visto:", erro));
  }

  return (
    <>
      {aberto && <TourBoasVindas aoFechar={async () => (tourVisto ? setAberto(false) : fecharPrimeiraVez())} />}
      <button type="button" className="link-ver-tour" onClick={() => setAberto(true)}>
        Ver tour de boas-vindas
      </button>
    </>
  );
}
