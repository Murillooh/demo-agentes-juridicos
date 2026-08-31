import Link from "next/link";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";

export default async function PeticoesPage() {
  const supabase = criarClienteSupabaseServidor();
  await obterUsuario(supabase);

  // RLS já filtra por escritório - esse select devolve as petições de todos
  // os advogados do mesmo escritório (histórico "por escritório e por
  // advogado" pedido na Etapa 2), não só as minhas.
  const { data: peticoes } = await supabase
    .from("peticoes")
    .select("id, titulo, area_direito, status, criado_em, atualizado_em, advogados(nome)")
    .order("criado_em", { ascending: false });

  return (
    <>
      <h1 className="titulo-pagina">Petições</h1>
      <p className="subtitulo-pagina">Histórico de petições geradas neste escritório.</p>

      <div style={{ marginBottom: "20px" }}>
        <Link href="/peticoes/nova">
          <button type="button">+ Nova petição</button>
        </Link>
      </div>

      {!peticoes || peticoes.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
          Nenhuma petição gerada ainda.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "820px" }}>
          {peticoes.map((p) => (
            <Link
              key={p.id}
              href={`/peticoes/${p.id}`}
              className="glass-panel"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                textDecoration: "none",
                color: "inherit",
                gap: "16px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <strong>{p.titulo}</strong>
                <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>
                  {p.area_direito} · {p.advogados?.nome} ·{" "}
                  {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <span className="badge" style={{ background: p.status === "finalizada" ? "var(--accent-glow)" : "rgba(255,255,255,0.06)", flexShrink: 0 }}>
                {p.status === "finalizada" ? "Finalizada" : "Rascunho"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
