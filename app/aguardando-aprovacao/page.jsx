import { sair } from "../login/actions";

// Sem sidebar de propósito - mesma ideia de /trocar-senha (única rota
// acessível enquanto aprovado=false, middleware força o redirect pra cá em
// qualquer outra rota).
export default function AguardandoAprovacaoPage() {
  return (
    <main className="shell">
      <div className="card">
        <span className="badge">Aguardando aprovação</span>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "26px", margin: "14px 0 6px" }}>
          Quase lá
        </h1>
        <p style={{ color: "var(--text-dim)", fontSize: "14px", marginBottom: "24px", lineHeight: 1.5 }}>
          Seu cadastro foi recebido. O administrador precisa liberar seu acesso antes de você conseguir entrar no
          sistema - avisamos por e-mail assim que isso acontecer.
        </p>
        <form action={sair}>
          <button type="submit" className="secundario" style={{ width: "100%" }}>
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
