import Link from "next/link";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../../lib/supabase/server";
import GerarPeticaoForm from "../../../../components/GerarPeticaoForm";

const PASSOS = [
  {
    titulo: "Descreva o caso",
    texto: "Fatos, partes e o que você já tem em mente - quanto mais contexto, melhor a minuta.",
  },
  {
    titulo: "IA escreve no seu estilo",
    texto: "Usa as petições-base da área (ou a que você escolher) como referência de tom e estrutura.",
  },
  {
    titulo: "Você revisa e ajusta",
    texto: "O texto abre no editor - é sempre uma minuta, nunca vai direto pro protocolo.",
  },
];

// Geração por IA pode passar de 10s facilmente (thinking + petição longa) -
// sem isso a função é cortada pelo limite padrão da Vercel bem antes de
// terminar. Nota: no plano Hobby a Vercel pode aplicar um teto menor que
// esse na prática, mesmo declarando um valor maior aqui.
export const maxDuration = 300;

export default async function NovaPeticaoPage() {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);

  // Só pra montar o seletor "usar esta como referência" - a geração em si
  // (app/(app)/peticoes/actions.js) confere tudo de novo no servidor, isso
  // aqui é só conveniência de UI.
  const { data: advogado } = await supabase.from("advogados").select("escritorio_id").eq("id", user.id).maybeSingle();
  const { data: peticoesBase } = advogado
    ? await supabase
        .from("peticoes_base")
        .select("id, area_direito, titulo")
        .eq("escritorio_id", advogado.escritorio_id)
        .order("area_direito")
        .order("criado_em", { ascending: false })
    : { data: [] };

  return (
    <>
      <h1 className="titulo-pagina">Nova petição</h1>
      <p className="subtitulo-pagina">
        A IA usa as petições-base cadastradas pra essa área do direito como referência de estilo.
      </p>

      {/* Card do form sozinho (max-width 640px antigo) sobrava vazio no
          resto da tela - agenda-layout (mesma grade de 2 colunas já usada
          em /agenda) dá pro form respirar e ainda usa o espaço do lado
          pra algo útil (como funciona) em vez de decoração. 1400 (não
          1100) pra bater com o teto já usado em outras telas largas
          (container-wide da landing) - 1100 ainda sobrava faixa vazia
          grande em tela larga. */}
      <div className="agenda-layout" style={{ maxWidth: "1400px" }}>
        <GerarPeticaoForm peticoesBase={peticoesBase || []} />

        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 className="titulo-secao" style={{ marginBottom: "4px" }}>
            Como funciona
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "4px" }}>3 passos até a minuta pronta.</p>
          <div>
            {PASSOS.map((passo, indice) => (
              <div key={passo.titulo} className="tour-item">
                <span className="tour-item-marca">{indice + 1}</span>
                <div>
                  <strong style={{ display: "block", marginBottom: "2px", fontSize: "14px" }}>{passo.titulo}</strong>
                  <span style={{ fontSize: "13px", color: "var(--text-dim)", lineHeight: 1.5 }}>{passo.texto}</span>
                </div>
              </div>
            ))}
          </div>
          {(peticoesBase || []).length === 0 && (
            <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
              Sem petições-base cadastradas ainda -{" "}
              <Link href="/peticoes-base" style={{ color: "var(--accent)" }}>
                cadastre uma
              </Link>{" "}
              pra IA ter um estilo de referência.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
