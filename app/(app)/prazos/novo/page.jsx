import { criarClienteSupabaseServidor, obterUsuario } from "../../../../lib/supabase/server";
import NovoPrazoForm from "../../../../components/NovoPrazoForm";

export const maxDuration = 60;

const PASSOS = [
  {
    titulo: "Cole o despacho",
    texto: "A IA lê o texto e identifica a data-limite e a regra do prazo (dias corridos ou úteis).",
  },
  {
    titulo: "Não identificou?",
    texto: "Você completa a mão (descrição + quantidade de dias) e o prazo é criado do mesmo jeito.",
  },
  {
    titulo: "Vira evento na agenda",
    texto: "O prazo aparece automaticamente em Agenda e Prazos, sem precisar cadastrar de novo.",
  },
];

export default async function NovoPrazoPage() {
  const supabase = criarClienteSupabaseServidor();
  await obterUsuario(supabase);

  const { data: peticoes } = await supabase.from("peticoes").select("id, titulo").order("criado_em", { ascending: false });

  return (
    <>
      <h1 className="titulo-pagina">Identificar prazo</h1>
      <p className="subtitulo-pagina">Cole o despacho — a IA calcula a data-limite e cria o evento na agenda.</p>

      {/* Mesmo ajuste de Nova Petição - card sozinho (max-width 640px)
          sobrava vazio no resto da tela. maxWidth 1100 ainda sobrava faixa
          vazia enorme em tela larga (NovoPrazoForm não tem mais cap próprio
          - o 1fr do grid é quem deveria abrir espaço) - 1400 pra bater com o
          teto já usado em outras telas largas (container-wide da landing). */}
      <div className="agenda-layout" style={{ maxWidth: "1400px" }}>
        <NovoPrazoForm peticoes={peticoes || []} />

        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 className="titulo-secao" style={{ marginBottom: "4px" }}>
            Como funciona
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "4px" }}>3 passos até o prazo na agenda.</p>
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
          <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--border)", lineHeight: 1.5 }}>
            Cálculo de dias úteis pula só sábado/domingo — não considera feriado nacional, estadual ou forense. Confira a
            data perto de feriado.
          </p>
        </div>
      </div>
    </>
  );
}
