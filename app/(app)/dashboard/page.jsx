import Link from "next/link";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import BotaoVerTour from "../../../components/BotaoVerTour";

function ResumoCard({ numero, rotulo, href }) {
  return (
    <Link href={href} className="glass-panel resumo-card" style={{ textDecoration: "none", color: "inherit" }}>
      <div className="resumo-card-numero">{numero}</div>
      <div className="resumo-card-rotulo">{rotulo}</div>
    </Link>
  );
}

export default async function DashboardPage() {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);

  const { data: advogado } = await supabase
    .from("advogados")
    .select("nome, tour_visto, escritorios(nome)")
    .eq("id", user.id)
    .maybeSingle();

  const { data: oabs } = await supabase
    .from("oabs")
    .select("numero, estado_uf, principal")
    .eq("advogado_id", user.id)
    .order("principal", { ascending: false });

  // head:true - só a contagem, sem trazer as linhas. 4 números que dão uma
  // visão real do escritório no primeiro olhar, em vez do texto fixo
  // "próximas etapas" que ficou esquecido aqui desde a Etapa 0.
  const [{ count: peticoesAndamento }, { count: prazosPendentes }, { count: atualizacoesNaoLidas }, { count: contratosAnalisados }] =
    await Promise.all([
      supabase.from("peticoes").select("id", { count: "exact", head: true }).neq("fase_kanban", "protocolo"),
      supabase.from("prazos").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      supabase.from("atualizacoes_diario").select("id", { count: "exact", head: true }).eq("lida", false),
      supabase.from("contratos").select("id", { count: "exact", head: true }).eq("status", "concluido"),
    ]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div>
          <h1 className="titulo-pagina">Olá, {advogado?.nome || "advogado"}</h1>
          <p className="subtitulo-pagina">{advogado?.escritorios?.nome}</p>
        </div>
        <BotaoVerTour tourVisto={!!advogado?.tour_visto} advogadoId={user.id} />
      </div>

      <div className="resumo-grade">
        <ResumoCard numero={peticoesAndamento || 0} rotulo="Petições em andamento" href="/board" />
        <ResumoCard numero={prazosPendentes || 0} rotulo="Prazos pendentes" href="/agenda" />
        <ResumoCard numero={atualizacoesNaoLidas || 0} rotulo="Atualizações não lidas" href="/atualizacoes" />
        <ResumoCard numero={contratosAnalisados || 0} rotulo="Contratos analisados" href="/contratos" />
      </div>

      <div className="glass-panel" style={{ padding: "28px", maxWidth: "480px" }}>
        <h3 className="titulo-secao" style={{ marginBottom: "16px" }}>
          Suas OABs
        </h3>
        {!oabs || oabs.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontSize: "14px", lineHeight: 1.5 }}>
            Nenhuma OAB cadastrada ainda. Sem ela, o Diário Oficial não tem o que monitorar - peça pra alguém do
            escritório adicionar.
          </p>
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
    </>
  );
}
