import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";

export default async function DashboardPage() {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);

  const { data: advogado } = await supabase
    .from("advogados")
    .select("nome, escritorios(nome)")
    .eq("id", user.id)
    .maybeSingle();

  const { data: oabs } = await supabase
    .from("oabs")
    .select("numero, estado_uf, principal")
    .eq("advogado_id", user.id)
    .order("principal", { ascending: false });

  return (
    <>
      <h1 className="titulo-pagina">Olá, {advogado?.nome || "advogado"}</h1>
      <p className="subtitulo-pagina">{advogado?.escritorios?.nome}</p>

      <div className="glass-panel" style={{ padding: "28px", maxWidth: "480px" }}>
        <h3 className="titulo-secao" style={{ marginBottom: "16px" }}>
          Suas OABs
        </h3>
        {!oabs || oabs.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>Nenhuma OAB cadastrada.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {oabs.map((oab) => (
              <div
                key={`${oab.numero}-${oab.estado_uf}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: "var(--panel-2)",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                }}
              >
                <span>
                  OAB/{oab.estado_uf} {oab.numero}
                </span>
                {oab.principal && <span className="badge">Principal</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ color: "var(--text-dim)", fontSize: "13px", marginTop: "24px" }}>
        Fundação da plataforma. Geração de petição, prazos, Diário Oficial, notificações e Kanban vêm nas
        próximas etapas.
      </p>
    </>
  );
}
