import { notFound } from "next/navigation";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../../lib/supabase/server";
import PeticaoEditor from "../../../../components/PeticaoEditor";

export default async function PeticaoPage({ params }) {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);

  const { data: peticao } = await supabase
    .from("peticoes")
    .select("id, titulo, area_direito, conteudo, status, escritorio_id, numero_processo, nome_cliente, onedrive_status, onedrive_erro, onedrive_link")
    .eq("id", params.id)
    .maybeSingle();

  // RLS já impede ver petição de outro escritório - maybeSingle() devolve
  // null tanto pra "não existe" quanto pra "existe mas não é meu", e os dois
  // casos têm que virar 404, não vazar diferença nenhuma pro usuário.
  if (!peticao) notFound();

  const { data: escritorio } = await supabase
    .from("escritorios")
    .select("nome, logo_url")
    .eq("id", peticao.escritorio_id)
    .maybeSingle();

  return (
    <>
      <h1 className="titulo-pagina">{peticao.titulo}</h1>
      <p className="subtitulo-pagina">{peticao.area_direito}</p>
      <PeticaoEditor peticao={peticao} escritorio={escritorio} />
    </>
  );
}
