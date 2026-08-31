import Link from "next/link";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";

const ROTULO_STATUS = {
  processando: { texto: "Processando", cor: "var(--text-dim)" },
  concluido: { texto: "Concluído", cor: "var(--accent)" },
  sem_texto: { texto: "Sem texto (escaneado)", cor: "var(--danger)" },
  falha: { texto: "Falha", cor: "var(--danger)" },
};

export default async function ContratosPage() {
  const supabase = criarClienteSupabaseServidor();
  await obterUsuario(supabase);

  // RLS já filtra por escritório - devolve os contratos de todos os
  // advogados do mesmo escritório, não só os meus (histórico é do
  // escritório, mesmo critério de aceite da Etapa 8).
  const { data: contratos } = await supabase
    .from("contratos")
    .select("id, nome_arquivo, status, criado_em, advogados(nome)")
    .order("criado_em", { ascending: false });

  return (
    <>
      <h1 className="titulo-pagina">Contratos</h1>
      <p className="subtitulo-pagina">Histórico de contratos analisados por IA neste escritório.</p>

      <div style={{ marginBottom: "20px" }}>
        <Link href="/contratos/novo">
          <button type="button">+ Analisar contrato</button>
        </Link>
      </div>

      {!contratos || contratos.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
          Nenhum contrato analisado ainda.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "820px" }}>
          {contratos.map((c) => {
            const status = ROTULO_STATUS[c.status] || ROTULO_STATUS.processando;
            return (
              <Link
                key={c.id}
                href={`/contratos/${c.id}`}
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
                  <strong>{c.nome_arquivo}</strong>
                  <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>
                    {c.advogados?.nome} · {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="badge" style={{ background: "rgba(255,255,255,0.06)", color: status.cor, flexShrink: 0 }}>
                  {status.texto}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
