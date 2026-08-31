"use client";
import { useFormState, useFormStatus } from "react-dom";
import { criarReuniao } from "../app/(app)/agenda/actions";

const ESTADO_INICIAL = { erro: "" };

function BotaoCriar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Criando…" : "Criar reunião"}
    </button>
  );
}

export default function NovaReuniaoForm({ dataInicial, peticoes }) {
  const [estado, acao] = useFormState(criarReuniao, ESTADO_INICIAL);

  return (
    <div className="glass-panel" style={{ padding: "22px" }}>
      <h3 className="titulo-secao" style={{ marginBottom: "16px" }}>
        Nova reunião
      </h3>
      <form action={acao} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <label>
          Título
          <input name="titulo" required placeholder='Ex.: "Reunião com cliente João"' />
        </label>
        <label>
          Data
          <input name="data" type="date" required defaultValue={dataInicial} />
        </label>
        <label>
          Petição vinculada (opcional)
          <select name="peticaoId" defaultValue="">
            <option value="">Nenhuma</option>
            {peticoes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.titulo}
              </option>
            ))}
          </select>
        </label>
        {estado?.erro && <p className="erro">{estado.erro}</p>}
        <BotaoCriar />
      </form>
    </div>
  );
}
