import Link from "next/link";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../../lib/supabase/server";
import RemoverAcompanhamentoButton from "../../../../components/RemoverAcompanhamentoButton";

export default async function AcompanhamentoPage() {
  const supabase = criarClienteSupabaseServidor();
  await obterUsuario(supabase);

  const { data: processos } = await supabase
    .from("processos_monitorados")
    .select("id, numero_cnj, tribunal, situacao_atual, ultima_verificacao")
    .order("criado_em", { ascending: false });

  return (
    <>
      <h1 className="titulo-pagina">Processos Acompanhados</h1>
      <p className="subtitulo-pagina">
        Verificação automática 1x/dia - avisamos por notificação quando o andamento mudar.{" "}
        <Link href="/processos" style={{ color: "var(--accent)" }}>
          Buscar outro processo →
        </Link>
      </p>

      {!processos || processos.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
          Nenhum processo em acompanhamento ainda. Busque um processo e clique em "Acompanhar automaticamente".
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "820px" }}>
          {processos.map((p) => (
            <div
              key={p.id}
              className="glass-panel"
              style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}
            >
              <div style={{ minWidth: 0 }}>
                <strong>{p.numero_cnj}</strong>
                <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "4px" }}>{p.tribunal}</p>
                <p style={{ fontSize: "13px", marginTop: "6px" }}>{p.situacao_atual || "Aguardando primeira verificação."}</p>
                {p.ultima_verificacao && (
                  <p style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
                    Última verificação: {new Date(p.ultima_verificacao).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
              <RemoverAcompanhamentoButton id={p.id} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
