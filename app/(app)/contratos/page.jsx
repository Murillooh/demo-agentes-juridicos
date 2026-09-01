import Link from "next/link";
import { FileText, FileWarning, Loader2 } from "lucide-react";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";

const ROTULO_STATUS = {
  processando: { texto: "Processando", cor: "var(--text-dim)", bg: "rgba(255,255,255,0.06)", Icone: Loader2 },
  concluido: { texto: "Concluído", cor: "var(--accent)", bg: "var(--accent-glow)", Icone: FileText },
  sem_texto: { texto: "Sem texto (escaneado)", cor: "var(--danger)", bg: "var(--danger-glow)", Icone: FileWarning },
  falha: { texto: "Falha", cor: "var(--danger)", bg: "var(--danger-glow)", Icone: FileWarning },
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <div>
          <h1 className="titulo-pagina" style={{ marginBottom: "6px" }}>
            Contratos
          </h1>
          <p className="subtitulo-pagina" style={{ marginBottom: 0 }}>
            Histórico de contratos analisados por IA neste escritório.
          </p>
        </div>
        <Link href="/contratos/novo">
          <button type="button">+ Analisar contrato</button>
        </Link>
      </div>

      {!contratos || contratos.length === 0 ? (
        <div className="glass-panel" style={{ padding: "56px 40px", textAlign: "center", color: "var(--text-dim)" }}>
          Nenhum contrato analisado ainda.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {contratos.map((c) => {
            const status = ROTULO_STATUS[c.status] || ROTULO_STATUS.processando;
            const Icone = status.Icone;
            return (
              <Link
                key={c.id}
                href={`/contratos/${c.id}`}
                className="glass-panel contrato-row"
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
                <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
                  <div className="contrato-icone">
                    <FileText size={19} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{c.nome_arquivo}</strong>
                    <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>
                      {c.advogados?.nome} · {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <span className="badge" style={{ background: status.bg, color: status.cor, flexShrink: 0, gap: "5px" }}>
                  <Icone size={11} className={c.status === "processando" ? "animate-spin" : ""} />
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
