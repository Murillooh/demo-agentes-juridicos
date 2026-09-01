import { redirect } from "next/navigation";
import { usuarioAdminDaRequisicao } from "../../lib/admin-servidor";
import { criarClienteSupabaseAdmin } from "../../lib/supabase/admin";
import { EMAIL_PREVIEW_ADVOGADO } from "../../lib/admin";
import AdminPainel from "../../components/AdminPainel";
import BotaoVerComoAdvogado from "../../components/BotaoVerComoAdvogado";

export default async function AdminPage() {
  const admin = await usuarioAdminDaRequisicao();
  if (!admin) redirect("/");

  const supabaseAdmin = criarClienteSupabaseAdmin();
  const { data: contas } = supabaseAdmin
    ? await supabaseAdmin
        .from("advogados")
        .select("id, nome, email, permissoes, aprovado, criado_em, ultimo_acesso, escritorio_id, escritorios(nome, logo_url, cor_sistema)")
        // Conta fixa de "Ver como advogado" não é cliente de verdade - não
        // deve aparecer misturada nos cards da própria tela que a cria.
        .neq("email", EMAIL_PREVIEW_ADVOGADO)
        .order("criado_em", { ascending: false })
    : { data: [] };

  return (
    <main style={{ maxWidth: "1400px", margin: "0 auto", padding: "44px 48px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h1 className="titulo-pagina">Painel Admin</h1>
          <p className="subtitulo-pagina">Criar e gerenciar contas de cliente - permissão por tela, logo e cor.</p>
        </div>
        <BotaoVerComoAdvogado />
      </div>
      <AdminPainel contas={contas || []} />
    </main>
  );
}
