import DemoAcessoForm from "../../components/DemoAcessoForm";

export default function DemoPage() {
  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: "480px" }}>
        <span className="badge">Acesso demo</span>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "26px", margin: "14px 0 6px" }}>
          Testar a plataforma
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: "14px", marginBottom: "24px", lineHeight: 1.5 }}>
          Cria um acesso temporário num escritório de demonstração já com petições, prazos e contratos de exemplo -
          nada de tela vazia.
        </p>
        <DemoAcessoForm />
      </div>
    </main>
  );
}
