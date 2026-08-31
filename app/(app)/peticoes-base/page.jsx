import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import PeticoesBaseForm from "../../../components/PeticoesBaseForm";

export default async function PeticoesBasePage() {
  const supabase = criarClienteSupabaseServidor();
  await obterUsuario(supabase); // garante sessão antes da query (RLS já protege, isso é só clareza)

  const { data: peticoesBase } = await supabase
    .from("peticoes_base")
    .select("id, area_direito, titulo, conteudo, criado_em")
    .order("criado_em", { ascending: false });

  return (
    <>
      <h1 className="titulo-pagina">Petições-base</h1>
      <p className="subtitulo-pagina">
        Referências de estilo por área do direito — a IA usa essas petições pra escrever no "jeito" do
        escritório.
      </p>
      <PeticoesBaseForm peticoesBase={peticoesBase || []} />
    </>
  );
}
