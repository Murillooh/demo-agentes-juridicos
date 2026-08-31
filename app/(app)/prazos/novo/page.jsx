import { criarClienteSupabaseServidor, obterUsuario } from "../../../../lib/supabase/server";
import NovoPrazoForm from "../../../../components/NovoPrazoForm";

export const maxDuration = 60;

export default async function NovoPrazoPage() {
  const supabase = criarClienteSupabaseServidor();
  await obterUsuario(supabase);

  const { data: peticoes } = await supabase.from("peticoes").select("id, titulo").order("criado_em", { ascending: false });

  return (
    <>
      <h1 className="titulo-pagina">Identificar prazo</h1>
      <p className="subtitulo-pagina">Cole o despacho — a IA calcula a data-limite e cria o evento na agenda.</p>
      <NovoPrazoForm peticoes={peticoes || []} />
    </>
  );
}
