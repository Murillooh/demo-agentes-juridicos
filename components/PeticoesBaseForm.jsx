"use client";
import { useFormState, useFormStatus } from "react-dom";
import { criarPeticaoBase, removerPeticaoBase } from "../app/(app)/peticoes-base/actions";
import { AREAS_DIREITO } from "../lib/areas-direito";

const ESTADO_INICIAL = { erro: "", sucesso: "" };

function BotaoCadastrar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Salvando…" : "Cadastrar petição-base"}
    </button>
  );
}

export default function PeticoesBaseForm({ peticoesBase }) {
  const [estado, acao] = useFormState(criarPeticaoBase, ESTADO_INICIAL);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="glass-panel" style={{ padding: "28px" }}>
        <h3 className="titulo-secao" style={{ marginBottom: "6px" }}>
          Nova petição-base
        </h3>
        <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "18px", lineHeight: 1.5 }}>
          Cole o texto completo de uma petição real já escrita pelo escritório. A IA usa isso como
          referência de estilo — quanto mais representativa, mais a petição gerada vai soar como o
          escritório escreve.
        </p>
        <form action={acao} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              Título
              <input name="titulo" required placeholder='Ex.: "Petição inicial - indenização por dano moral"' />
            </label>
          </div>
          <label>
            Texto completo da petição
            <textarea name="conteudo" required rows={10} placeholder="Cole aqui o texto completo…" />
          </label>
          {estado?.erro && <p className="erro">{estado.erro}</p>}
          {estado?.sucesso && <p className="info">{estado.sucesso}</p>}
          <BotaoCadastrar />
        </form>
      </div>

      <div>
        <h3 className="titulo-secao" style={{ marginBottom: "14px" }}>
          Cadastradas ({peticoesBase.length})
        </h3>
        {peticoesBase.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>Nenhuma petição-base cadastrada ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {peticoesBase.map((pb) => (
              <div
                key={pb.id}
                className="glass-panel"
                style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}
              >
                <div style={{ minWidth: 0 }}>
                  <span className="badge" style={{ marginBottom: "6px" }}>
                    {pb.area_direito}
                  </span>
                  <p style={{ fontWeight: 600, marginTop: "6px" }}>{pb.titulo}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
                    {pb.conteudo.length.toLocaleString("pt-BR")} caracteres
                  </p>
                </div>
                <form action={removerPeticaoBase.bind(null, pb.id)}>
                  <button type="submit" className="secundario">
                    Remover
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
