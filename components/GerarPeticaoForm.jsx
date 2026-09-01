"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { gerarPeticao } from "../app/(app)/peticoes/actions";
import { AREAS_DIREITO } from "../lib/areas-direito";

const ESTADO_INICIAL = { erro: "" };

function BotaoGerar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Gerando com IA… (pode levar até 1 minuto)" : "Gerar minuta"}
    </button>
  );
}

// <select> nativo com fundo escuro faz o Windows/Chrome pintar as opções não
// focadas numa cor estranha (herança parcial do tema do SO, sem jeito de
// controlar 100% só com CSS) - esse dropdown troca a lista inteira por divs
// nossas, sempre no tema certo em qualquer SO/navegador. O valor real vai
// num <input type="hidden"> pro form continuar funcionando igual (FormData
// nem percebe a diferença).
function SeletorPeticaoBase({ peticoesPorArea, valor, aoMudar }) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function aoClicarFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setAberto(false);
    }
    function aoApertarEsc(e) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoApertarEsc);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoApertarEsc);
    };
  }, []);

  const todasPeticoes = Object.values(peticoesPorArea).flat();
  const selecionada = todasPeticoes.find((pb) => pb.id === valor);
  const rotulo = selecionada ? selecionada.titulo : "Nenhuma - a IA escolhe pela área do direito";

  function escolher(id) {
    aoMudar(id);
    setAberto(false);
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input type="hidden" name="peticaoBaseId" value={valor} />
      <button
        type="button"
        className="secundario seletor-peticao-base-gatilho"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
      >
        <span className={selecionada ? "" : "seletor-peticao-base-placeholder"}>{rotulo}</span>
        <ChevronDown size={16} style={{ flexShrink: 0, transform: aberto ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
      </button>

      {aberto && (
        <div className="seletor-peticao-base-lista" role="listbox">
          <button
            type="button"
            role="option"
            aria-selected={valor === ""}
            className="seletor-peticao-base-opcao"
            onClick={() => escolher("")}
          >
            <span>Nenhuma - a IA escolhe pela área do direito</span>
            {valor === "" && <Check size={15} />}
          </button>

          {Object.entries(peticoesPorArea).map(([area, itens]) => (
            <div key={area}>
              <div className="seletor-peticao-base-grupo">{area}</div>
              {itens.map((pb) => (
                <button
                  key={pb.id}
                  type="button"
                  role="option"
                  aria-selected={valor === pb.id}
                  className="seletor-peticao-base-opcao"
                  onClick={() => escolher(pb.id)}
                >
                  <span>{pb.titulo}</span>
                  {valor === pb.id && <Check size={15} />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GerarPeticaoForm({ peticoesBase = [] }) {
  const [estado, acao] = useFormState(gerarPeticao, ESTADO_INICIAL);
  const [peticaoBaseId, setPeticaoBaseId] = useState("");

  const peticoesPorArea = peticoesBase.reduce((acc, pb) => {
    (acc[pb.area_direito] ||= []).push(pb);
    return acc;
  }, {});

  return (
    <div className="glass-panel" style={{ padding: "28px" }}>
      <form action={acao} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div className="grade-campos grade-campos-1-2">
          <label>
            Área do direito
            <select name="areaDireito" required defaultValue="">
              <option value="" disabled>
                Selecione…
              </option>
              {AREAS_DIREITO.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </label>
          <label>
            Título da petição
            <input name="titulo" required placeholder='Ex.: "Petição inicial - João da Silva"' />
          </label>
        </div>
        <label>
          Petição-base de referência (opcional)
          <SeletorPeticaoBase peticoesPorArea={peticoesPorArea} valor={peticaoBaseId} aoMudar={setPeticaoBaseId} />
        </label>
        <label>
          Descreva o caso (ou cole os dados do processo)
          <textarea
            name="descricaoCaso"
            required
            rows={10}
            placeholder="Fatos do caso, partes envolvidas, pedido, fundamentos que você já tem em mente…"
          />
        </label>

        {estado?.erro && (
          <div className="erro" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span>{estado.erro}</span>
            {estado.semReferencia && (
              <Link href="/peticoes-base" style={{ color: "var(--danger)", textDecoration: "underline", fontWeight: 600 }}>
                Ir pra Petições-base →
              </Link>
            )}
          </div>
        )}

        <BotaoGerar />
      </form>
      <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "16px", lineHeight: 1.5 }}>
        O texto gerado é sempre uma minuta — você revisa e ajusta no editor antes de considerar pronto.
      </p>
    </div>
  );
}
