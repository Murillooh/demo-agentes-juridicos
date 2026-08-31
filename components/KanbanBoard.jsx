"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { criarClienteSupabaseNavegador } from "../lib/supabase/client";
import { moverFasePeticao, definirResponsavel } from "../app/(app)/board/actions";

const COLUNAS = [
  { fase: "criacao", titulo: "Criação" },
  { fase: "revisao", titulo: "Revisão" },
  { fase: "protocolo", titulo: "Protocolo" },
];
const PROXIMA_FASE = { criacao: "revisao", revisao: "protocolo", protocolo: null };
const CAMPO_RESPONSAVEL = { revisao: "responsavel_revisao_id", protocolo: "responsavel_protocolo_id" };
const ROTULO_FASE = { revisao: "revisão", protocolo: "protocolo" };

// Heurística simples de "parada há muito tempo" - dias corridos desde a
// última troca de fase, não dias úteis (mesma ressalva já feita em
// lib/dias-uteis.js pra prazo: aqui é só indicador visual, não conta pra
// nenhum prazo processual real).
const DIAS_PARA_ALERTA = 3;

function diasParados(dataISO) {
  return Math.floor((Date.now() - new Date(dataISO).getTime()) / (24 * 60 * 60 * 1000));
}

export default function KanbanBoard({ escritorioId, peticoesIniciais, advogados }) {
  const [peticoes, setPeticoes] = useState(peticoesIniciais);
  const [arrastandoId, setArrastandoId] = useState(null);
  const [colunaAlvo, setColunaAlvo] = useState(null);
  const [erro, setErro] = useState("");
  const peticoesRef = useRef(peticoes);
  peticoesRef.current = peticoes;

  // Realtime - qualquer sessão movendo um cartão desse escritório (inclusive
  // essa mesma aba em outra janela) chega aqui sem reload. replica identity
  // full (migration 006) garante que payload.new vem com a linha inteira,
  // não só a chave primária.
  useEffect(() => {
    const supabase = criarClienteSupabaseNavegador();
    const canal = supabase
      .channel(`board-${escritorioId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "peticoes", filter: `escritorio_id=eq.${escritorioId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setPeticoes((atual) => atual.filter((p) => p.id !== payload.old.id));
            return;
          }
          setPeticoes((atual) => {
            const existe = atual.some((p) => p.id === payload.new.id);
            if (!existe) {
              // Petição nova criada em outra sessão - payload não tem o
              // join "criador" (isso só existe no fetch inicial do Server
              // Component), aparece sem esse dado até o próximo reload.
              return [{ ...payload.new }, ...atual];
            }
            // Spread por cima só do que veio na linha - "criador" (join)
            // não existe em payload.new, então não some do card.
            return atual.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p));
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [escritorioId]);

  async function moverPara(id, novaFase) {
    const anterior = peticoesRef.current.find((p) => p.id === id);
    if (!anterior || anterior.fase_kanban === novaFase) return;

    setErro("");
    // Otimista: atualiza local antes de esperar o servidor - é o feedback
    // visual imediato pedido no critério de qualidade. Se a persistência
    // falhar, volta pro estado anterior (por isso guarda "anterior" antes
    // de mexer no state).
    setPeticoes((atual) =>
      atual.map((p) => (p.id === id ? { ...p, fase_kanban: novaFase, fase_atualizada_em: new Date().toISOString() } : p))
    );

    const resultado = await moverFasePeticao(id, novaFase);
    if (resultado?.erro) {
      setErro(resultado.erro);
      setPeticoes((atual) => atual.map((p) => (p.id === id ? anterior : p)));
    }
  }

  function aoSoltar(e, novaFase) {
    e.preventDefault();
    setColunaAlvo(null);
    const id = e.dataTransfer.getData("text/plain");
    setArrastandoId(null);
    if (id) moverPara(id, novaFase);
  }

  function aoTrocarResponsavel(peticaoId, proximaFase, advogadoId) {
    const campo = CAMPO_RESPONSAVEL[proximaFase];
    setPeticoes((atual) => atual.map((p) => (p.id === peticaoId ? { ...p, [campo]: advogadoId || null } : p)));
    definirResponsavel(peticaoId, proximaFase, advogadoId || null);
  }

  const colunas = useMemo(() => {
    const mapa = { criacao: [], revisao: [], protocolo: [] };
    for (const p of peticoes) (mapa[p.fase_kanban] || mapa.criacao).push(p);
    return mapa;
  }, [peticoes]);

  return (
    <div>
      {erro && (
        <p className="erro" style={{ marginBottom: "16px" }}>
          {erro}
        </p>
      )}
      <div className="board-colunas">
        {COLUNAS.map((coluna) => (
          <div
            key={coluna.fase}
            className={`board-coluna${colunaAlvo === coluna.fase ? " board-coluna-alvo" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (colunaAlvo !== coluna.fase) setColunaAlvo(coluna.fase);
            }}
            onDragLeave={() => setColunaAlvo((atual) => (atual === coluna.fase ? null : atual))}
            onDrop={(e) => aoSoltar(e, coluna.fase)}
          >
            <div className="board-coluna-titulo">
              {coluna.titulo}
              <span className="board-coluna-contagem">{colunas[coluna.fase].length}</span>
            </div>

            <div className="board-coluna-cartoes">
              {colunas[coluna.fase].length === 0 && <p className="board-coluna-vazia">Nenhuma petição aqui.</p>}
              {colunas[coluna.fase].map((p) => {
                const dias = diasParados(p.fase_atualizada_em);
                const parada = dias >= DIAS_PARA_ALERTA;
                const proximaFase = PROXIMA_FASE[p.fase_kanban];
                const campoResponsavel = proximaFase ? CAMPO_RESPONSAVEL[proximaFase] : null;

                return (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", p.id);
                      setArrastandoId(p.id);
                    }}
                    onDragEnd={() => setArrastandoId(null)}
                    className={`board-card${arrastandoId === p.id ? " board-card-arrastando" : ""}${parada ? " board-card-parada" : ""}`}
                  >
                    <Link href={`/peticoes/${p.id}`} className="board-card-titulo">
                      {p.titulo}
                    </Link>
                    <p className="board-card-meta">
                      {p.area_direito} · {p.criador?.nome || "—"}
                    </p>
                    {parada && <span className="badge board-card-badge-parada">Parada há {dias} dia(s)</span>}
                    {campoResponsavel && (
                      <label className="board-card-responsavel">
                        Responsável ({ROTULO_FASE[proximaFase]})
                        <select
                          value={p[campoResponsavel] || ""}
                          onChange={(e) => aoTrocarResponsavel(p.id, proximaFase, e.target.value)}
                        >
                          <option value="">Sem responsável</option>
                          {advogados.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
