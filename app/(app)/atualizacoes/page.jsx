import Link from "next/link";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import { limparHtml } from "../../../lib/limpar-html";
import VerificarDiarioButton from "../../../components/VerificarDiarioButton";
import MarcarLidaButton from "../../../components/MarcarLidaButton";

// verificarAgora (Server Action chamada por VerificarDiarioButton) consulta
// o DJEN pra cada OAB do escritório - pode passar de 10s facilmente com
// várias OABs.
export const maxDuration = 300;

export default async function AtualizacoesPage() {
  const supabase = criarClienteSupabaseServidor();
  await obterUsuario(supabase);

  const { data: atualizacoes } = await supabase
    .from("atualizacoes_diario")
    .select("id, tribunal, orgao, tipo_comunicacao, texto, data_disponibilizacao, lida, numero_processo, oabs(numero, estado_uf), peticoes(id, titulo)")
    .order("data_disponibilizacao", { ascending: false })
    .limit(100);

  const naoLidas = (atualizacoes || []).filter((a) => !a.lida).length;

  return (
    <>
      <h1 className="titulo-pagina">Atualizações do Diário</h1>
      <p className="subtitulo-pagina">
        Publicações do Diário de Justiça Eletrônico Nacional (DJEN/CNJ) encontradas pelas OABs do
        escritório. {naoLidas > 0 && <strong style={{ color: "var(--accent)" }}>{naoLidas} não lida(s).</strong>}
      </p>

      <div style={{ marginBottom: "24px" }}>
        <VerificarDiarioButton />
      </div>

      {!atualizacoes || atualizacoes.length === 0 ? (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
          Nenhuma atualização ainda. Clique em "Verificar agora" ou espere a verificação automática diária.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "820px" }}>
          {atualizacoes.map((a) => (
            <div
              key={a.id}
              className="glass-panel"
              style={{ padding: "18px 22px", borderColor: a.lida ? undefined : "var(--accent)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
                    {!a.lida && <span className="badge">Não lida</span>}
                    <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
                      {a.tribunal} · OAB {a.oabs?.numero}/{a.oabs?.estado_uf} ·{" "}
                      {new Date(`${a.data_disponibilizacao}T00:00:00`).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p style={{ fontWeight: 600 }}>{a.tipo_comunicacao || "Comunicação"} — {a.orgao}</p>
                  <p style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "4px" }}>{limparHtml(a.texto)}</p>
                  {a.peticoes?.titulo && (
                    <Link href={`/peticoes/${a.peticoes.id}`} style={{ fontSize: "12px", color: "var(--accent)" }}>
                      Vinculada à petição: {a.peticoes.titulo} →
                    </Link>
                  )}
                </div>
                {!a.lida && <MarcarLidaButton id={a.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
