import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import KanbanBoard from "../../../components/KanbanBoard";

export default async function BoardPage() {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);

  const { data: advogado } = await supabase.from("advogados").select("escritorio_id").eq("id", user.id).maybeSingle();
  if (!advogado) return null;

  // "!advogado_id" desambigua: depois da Etapa 6, peticoes tem 3 FKs pra
  // advogados (advogado_id, responsavel_revisao_id, responsavel_protocolo_id)
  // - um embed "advogados(nome)" sem essa dica vira erro de ambiguidade no
  // PostgREST.
  const { data: peticoes } = await supabase
    .from("peticoes")
    .select(
      "id, titulo, area_direito, fase_kanban, fase_atualizada_em, responsavel_revisao_id, responsavel_protocolo_id, criador:advogados!advogado_id(nome)"
    )
    .eq("escritorio_id", advogado.escritorio_id)
    .order("criado_em", { ascending: false });

  const { data: advogados } = await supabase.from("advogados").select("id, nome").order("nome");

  return (
    <>
      <h1 className="titulo-pagina">Board de Petições</h1>
      <p className="subtitulo-pagina">
        Arraste os cartões entre as colunas. O estado é do escritório inteiro - atualiza pra todo mundo na hora, sem
        precisar recarregar.
      </p>
      <KanbanBoard escritorioId={advogado.escritorio_id} peticoesIniciais={peticoes || []} advogados={advogados || []} />
    </>
  );
}
