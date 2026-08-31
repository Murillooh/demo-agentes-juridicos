import { redirect } from "next/navigation";
import { criarClienteSupabaseServidor, obterUsuario } from "../../lib/supabase/server";
import Sidebar from "../../components/Sidebar";

export default async function AppLayout({ children }) {
  const supabase = criarClienteSupabaseServidor();

  if (!supabase) {
    return (
      <main className="shell">
        <div className="card">
          <span className="badge">Configuração pendente</span>
          <h1 style={{ fontFamily: "var(--font-serif)", margin: "14px 0 6px" }}>Ambiente não configurado</h1>
          <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>
            Faltam as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.
          </p>
        </div>
      </main>
    );
  }

  const user = await obterUsuario(supabase);

  // Defesa extra - o middleware já redireciona sem sessão, mas Server
  // Component não deve confiar só nisso.
  if (!user) {
    redirect("/");
  }

  const { data: advogado } = await supabase
    .from("advogados")
    .select("nome, email, precisa_trocar_senha, escritorios(nome)")
    .eq("id", user.id)
    .maybeSingle();

  // Mesma lógica do middleware, repetida aqui de propósito: middleware pode
  // ter deixado passar por causa de timeout (fail-open), a página não pode
  // repetir essa folga.
  if (advogado?.precisa_trocar_senha) {
    redirect("/trocar-senha");
  }

  return (
    <div className="app-layout">
      <Sidebar nome={advogado?.nome} email={advogado?.email || user.email} nomeEscritorio={advogado?.escritorios?.nome} />
      <main className="app-main">{children}</main>
    </div>
  );
}
