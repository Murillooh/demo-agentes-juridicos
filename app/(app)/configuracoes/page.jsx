import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import ConfiguracoesForm from "../../../components/ConfiguracoesForm";

export default async function ConfiguracoesPage() {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);

  const { data: advogado } = await supabase
    .from("advogados")
    .select("escritorios(nome, logo_url)")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <h1 className="titulo-pagina">Configurações</h1>
      <p className="subtitulo-pagina">Identidade visual usada nas petições exportadas.</p>
      <ConfiguracoesForm nome={advogado?.escritorios?.nome} logoUrl={advogado?.escritorios?.logo_url} />
    </>
  );
}
