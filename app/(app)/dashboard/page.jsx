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

const ATALHOS = [
  { titulo: "Nova petição", descricao: "Gerar minuta com IA", href: "/peticoes/nova" },
  { titulo: "Identificar prazo", descricao: "Colar despacho", href: "/prazos/novo" },
  { titulo: "Buscar processo", descricao: "Consultar por número/OAB", href: "/processos" },
  { titulo: "Petições-base", descricao: "Cadastrar referência de estilo", href: "/peticoes-base" },
];

// "Em Xd" (dias corridos) - mesma unidade que a IA usa pra calcular
// data_limite (Identificar Prazo não distingue dias úteis por padrão), não
// faz sentido a leitura no dashboard usar uma conta diferente da que gerou
// o prazo.
function rotuloPrazo(dataLimiteISO) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(`${dataLimiteISO}T00:00:00`);
  const dias = Math.round((limite - hoje) / (24 * 60 * 60 * 1000));

  if (dias < 0) return { texto: `Atrasado há ${Math.abs(dias)}d`, urgente: true };
  if (dias === 0) return { texto: "Hoje", urgente: true };
  if (dias === 1) return { texto: "Amanhã", urgente: true };
  if (dias <= 5) return { texto: `Em ${dias}d`, urgente: true };
  return { texto: `Em ${dias}d`, urgente: false };
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

  const { data: proximosPrazos } = await supabase
    .from("prazos")
    .select("id, descricao_prazo, data_limite, peticoes(titulo)")
    .eq("status", "pendente")
    .order("data_limite", { ascending: true })
    .limit(5);

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

      <div className="painel-grade">
        <div className="glass-panel" style={{ padding: "28px" }}>
          <h3 className="titulo-secao" style={{ marginBottom: "16px" }}>
            Próximos prazos
          </h3>
          {!proximosPrazos || proximosPrazos.length === 0 ? (
            <p style={{ color: "var(--text-dim)", fontSize: "14px", lineHeight: 1.5 }}>
              Nenhum prazo pendente. Cole um despacho em{" "}
              <Link href="/prazos/novo" style={{ color: "var(--accent)" }}>
                Identificar Prazo
              </Link>{" "}
              pra IA calcular a data e criar o evento na agenda.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {proximosPrazos.map((prazo) => {
                const { texto, urgente } = rotuloPrazo(prazo.data_limite);
                return (
                  <Link
                    key={prazo.id}
                    href="/agenda"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 14px",
                      background: "var(--panel-2)",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {prazo.descricao_prazo}
                      {prazo.peticoes?.titulo && (
                        <span style={{ color: "var(--text-dim)" }}> — {prazo.peticoes.titulo}</span>
                      )}
                    </span>
                    <span
                      className="badge"
                      style={{ flexShrink: 0, whiteSpace: "nowrap", ...(urgente && { background: "var(--danger-glow)", color: "var(--danger)" }) }}
                    >
                      {texto}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: "28px" }}>
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

        <div className="glass-panel" style={{ padding: "28px" }}>
          <h3 className="titulo-secao" style={{ marginBottom: "16px" }}>
            Atalhos rápidos
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {ATALHOS.map((atalho) => (
              <Link
                key={atalho.href}
                href={atalho.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "10px 14px",
                  background: "var(--panel-2)",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color 0.15s ease",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "14px" }}>{atalho.titulo}</span>
                <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>{atalho.descricao}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
