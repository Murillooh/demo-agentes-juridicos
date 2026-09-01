// Next mostra isso na hora, antes até da Server Component da página
// (EntrarComoAdvogadoAutomaticoPage) terminar de checar admin - sem isso
// a navegação ficava com a tela anterior/em branco por um instante até o
// JS do client component (EntrarComoAdvogadoAutomatico) montar. Mesmo
// visual do estado "entrando" de lá, só que renderizado no servidor,
// instantâneo.
export default function CarregandoEntrarComoAdvogado() {
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
