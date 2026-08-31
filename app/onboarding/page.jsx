import OnboardingForm from "../../components/OnboardingForm";

export default function OnboardingPage() {
  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: "560px" }}>
        <span className="badge">Novo escritório</span>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "26px", margin: "14px 0 6px" }}>
          Criar cadastro
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: "14px", marginBottom: "24px", lineHeight: 1.5 }}>
          Cria o escritório e o seu acesso de advogado responsável. Uma senha temporária é gerada — você
          troca no primeiro login.
        </p>
        <OnboardingForm />
      </div>
    </main>
  );
}
