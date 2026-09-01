"use client";

// Chip clicável de tela liberada - visual único usado em toda tela do
// admin que seleciona/mostra telas (form de criação, aprovação de
// pendente, popup de cliente já aprovado).
export default function TelaChip({ label, marcado, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="badge"
      style={{
        cursor: "pointer",
        border: "1px solid",
        borderColor: marcado ? "var(--accent)" : "var(--border)",
        background: marcado ? "var(--accent-glow)" : "rgba(255,255,255,0.03)",
        color: marcado ? "var(--accent)" : "var(--text-dim)",
      }}
    >
      {label}
    </button>
  );
}
