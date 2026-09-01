import { redirect } from "next/navigation";
import { usuarioAdminDaRequisicao } from "../../lib/admin-servidor";
import { criarClienteSupabaseAdmin } from "../../lib/supabase/admin";
import AdminPainel from "../../components/AdminPainel";

export default async function AdminPage() {
  const admin = await usuarioAdminDaRequisicao();
  if (!admin) redirect("/");

  const supabaseAdmin = criarClienteSupabaseAdmin();
  const { data: contas } = supabaseAdmin
    ? await supabaseAdmin
        .from("advogados")
        .select("id, nome, email, permissoes, criado_em, escritorio_id, escritorios(nome, logo_url, cor_sistema)")
        .order("criado_em", { ascending: false })
    : { data: [] };

  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "44px 24px" }}>
      <h1 className="titulo-pagina">Painel Admin</h1>
      <p className="subtitulo-pagina">Criar e gerenciar contas de cliente - permissão por tela, logo e cor.</p>
      <AdminPainel contas={contas || []} />
    </main>
  );
}
