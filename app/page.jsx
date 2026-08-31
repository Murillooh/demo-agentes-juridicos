import Link from "next/link";
import LoginForm from "../components/LoginForm";

export default function Home() {
  return (
    <main className="shell">
      <div className="card">
        <span className="badge">Plataforma Jurídica</span>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "26px", margin: "14px 0 6px" }}>
          Entrar
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: "14px", marginBottom: "24px", lineHeight: 1.5 }}>
          Acesse com o e-mail e senha do seu escritório.
        </p>

        <LoginForm />

        <p style={{ marginTop: "22px", fontSize: "13px", color: "var(--text-dim)", textAlign: "center" }}>
          Escritório novo?{" "}
          <Link href="/onboarding" style={{ color: "var(--accent)" }}>
            Criar cadastro
          </Link>
        </p>
      </div>
    </main>
  );
}
