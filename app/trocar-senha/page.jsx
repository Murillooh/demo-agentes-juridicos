import TrocarSenhaForm from "../../components/TrocarSenhaForm";

// Sem sidebar de propósito - essa é a ÚNICA tela acessível enquanto
// precisa_trocar_senha estiver true (middleware força o redirect pra cá em
// qualquer outra rota). Layout isolado evita a tentação de deixar
// navegação visível "só essa vez".
export default function TrocarSenhaPage() {
  return (
    <main className="shell">
      <div className="card">
        <span className="badge">Primeiro acesso</span>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "26px", margin: "14px 0 6px" }}>
          Defina sua senha
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: "14px", marginBottom: "24px", lineHeight: 1.5 }}>
          Você entrou com uma senha temporária. Defina uma senha definitiva antes de continuar.
        </p>
        <TrocarSenhaForm />
      </div>
    </main>
  );
}
