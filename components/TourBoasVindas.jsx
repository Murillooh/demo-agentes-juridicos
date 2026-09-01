"use client";
import { useState } from "react";

const ITENS = [
  { marca: "B", titulo: "Board", texto: "Acompanhe petições passando por Criação, Revisão e Protocolo - arraste os cartões entre as colunas." },
  { marca: "P", titulo: "Petições", texto: "Gere uma minuta nova com IA, no estilo do escritório (a partir das petições-base cadastradas)." },
  { marca: "Pz", titulo: "Prazos e Agenda", texto: "Cole um despacho e a IA identifica o prazo - vira evento automático na agenda." },
  { marca: "C", titulo: "Contratos", texto: "Envie um PDF ou DOCX e receba uma leitura estruturada: partes, objeto, vigência, pontos de atenção." },
  { marca: "D", titulo: "Diário Oficial", texto: "Monitoramento automático por OAB cadastrada, com notificação por e-mail/WhatsApp quando sai algo novo." },
];

// Mostrado 1x no /dashboard enquanto advogados.tour_visto for false
// (Etapa 9 - "tela inicial explicativa no primeiro login"); depois disso
// só reaparece se o advogado clicar em "Ver tour novamente" (ver
// BotaoVerTour). Controlado pelo pai: quem decide se está aberto e o que
// acontece ao fechar é o `aoFechar`.
export default function TourBoasVindas({ aoFechar }) {
  const [fechando, setFechando] = useState(false);

  async function fechar() {
    setFechando(true);
    await aoFechar();
    setFechando(false);
  }

  return (
    <div className="tour-fundo">
      <div className="glass-panel tour-modal" style={{ padding: "32px" }}>
        <span className="badge">Bem-vindo</span>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "24px", margin: "14px 0 6px" }}>
          Um resumo rápido do sistema
        </h2>
        <p style={{ color: "var(--text-dim)", fontSize: "14px", marginBottom: "8px" }}>5 áreas pra conhecer primeiro:</p>
        <div style={{ marginBottom: "24px" }}>
          {ITENS.map((item) => (
            <div key={item.titulo} className="tour-item">
              <span className="tour-item-marca">{item.marca}</span>
              <div>
                <strong style={{ display: "block", marginBottom: "2px" }}>{item.titulo}</strong>
                <span style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.5 }}>{item.texto}</span>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={fechar} disabled={fechando} style={{ width: "100%" }}>
          {fechando ? "Só um instante…" : "Entendi, vamos lá"}
        </button>
      </div>
    </div>
  );
}
