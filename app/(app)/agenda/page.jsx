import Link from "next/link";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import { montarGradeMes, formatarDataISO, NOMES_MES } from "../../../lib/calendario";
import NovaReuniaoForm from "../../../components/NovaReuniaoForm";
import RemoverReuniaoButton from "../../../components/RemoverReuniaoButton";

export default async function AgendaPage({ searchParams }) {
  const hoje = new Date();
  const hojeISO = formatarDataISO(hoje);

  const [anoParam, mesParam] = (searchParams?.mes || "").split("-");
  const ano = Number(anoParam) || hoje.getFullYear();
  const mesIndiceZero = mesParam ? Number(mesParam) - 1 : hoje.getMonth();

  const dataSelecionada = searchParams?.data || hojeISO;

  const grade = montarGradeMes(ano, mesIndiceZero);
  const inicioGrade = formatarDataISO(grade[0][0].data);
  const fimGrade = formatarDataISO(grade[grade.length - 1][6].data);

  const supabase = criarClienteSupabaseServidor();
  await obterUsuario(supabase);

  const [{ data: eventos }, { data: peticoes }] = await Promise.all([
    supabase
      .from("eventos_agenda")
      .select("id, tipo, titulo, data, peticao_id, peticoes(titulo)")
      .gte("data", inicioGrade)
      .lte("data", fimGrade)
      .order("data"),
    supabase.from("peticoes").select("id, titulo").order("criado_em", { ascending: false }),
  ]);

  const eventosPorDia = {};
  for (const ev of eventos || []) {
    (eventosPorDia[ev.data] ||= []).push(ev);
  }

  const mesAnterior = new Date(ano, mesIndiceZero - 1, 1);
  const proximoMes = new Date(ano, mesIndiceZero + 1, 1);
  const paramMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const eventosDoDia = eventosPorDia[dataSelecionada] || [];

  return (
    <>
      <h1 className="titulo-pagina">Agenda</h1>
      <p className="subtitulo-pagina">Prazos automáticos e reuniões, num só calendário.</p>

      <div className="agenda-layout">
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <Link href={`/agenda?mes=${paramMes(mesAnterior)}`}>
              <button type="button" className="secundario">
                ← Anterior
              </button>
            </Link>
            <strong style={{ fontSize: "16px" }}>
              {NOMES_MES[mesIndiceZero]} {ano}
            </strong>
            <Link href={`/agenda?mes=${paramMes(proximoMes)}`}>
              <button type="button" className="secundario">
                Próximo →
              </button>
            </Link>
          </div>

          <div className="calendario-grade">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="calendario-cabecalho-dia">
                {d}
              </div>
            ))}
            {grade.flat().map(({ data, noMes }) => {
              const iso = formatarDataISO(data);
              const eventosDia = eventosPorDia[iso] || [];
              const selecionado = iso === dataSelecionada;
              const ehHoje = iso === hojeISO;
              return (
                <Link
                  key={iso}
                  href={`/agenda?mes=${paramMes(new Date(ano, mesIndiceZero, 1))}&data=${iso}`}
                  className={`calendario-dia ${noMes ? "" : "calendario-dia-fora"} ${selecionado ? "calendario-dia-selecionado" : ""}`}
                >
                  <span className={ehHoje ? "calendario-dia-numero-hoje" : "calendario-dia-numero"}>{data.getDate()}</span>
                  <div className="calendario-dia-eventos">
                    {eventosDia.slice(0, 3).map((ev) => (
                      <span key={ev.id} className={`evento-chip evento-chip-${ev.tipo}`}>
                        {ev.titulo}
                      </span>
                    ))}
                    {eventosDia.length > 3 && (
                      <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>+{eventosDia.length - 3}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass-panel" style={{ padding: "20px" }}>
            <h3 className="titulo-secao" style={{ marginBottom: "14px" }}>
              {new Date(`${dataSelecionada}T00:00:00`).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </h3>
            {eventosDoDia.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-dim)" }}>Nada nesse dia.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {eventosDoDia.map((ev) => (
                  <div key={ev.id} style={{ padding: "10px 12px", background: "var(--panel-2)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div>
                        <span className={`badge`} style={{ marginBottom: "6px" }}>
                          {ev.tipo === "prazo" ? "Prazo" : "Reunião"}
                        </span>
                        <p style={{ fontWeight: 600, marginTop: "6px" }}>{ev.titulo}</p>
                        {ev.peticoes?.titulo && (
                          <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
                            {ev.peticoes.titulo}
                          </p>
                        )}
                      </div>
                      {ev.tipo === "reuniao" && <RemoverReuniaoButton id={ev.id} />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <NovaReuniaoForm dataInicial={dataSelecionada} peticoes={peticoes || []} />
        </div>
      </div>
    </>
  );
}
