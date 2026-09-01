"use client";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { criarContaCliente, atualizarPermissoes, atualizarWhiteLabel, removerConta } from "../app/admin/actions";
import { TELAS } from "../lib/permissoes";

const ESTADO_INICIAL = { erro: "" };

function BotaoCriar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Criando…" : "Criar acesso"}
    </button>
  );
}

function ContaCard({ conta }) {
  const [permissoes, setPermissoes] = useState(conta.permissoes); // null = tudo liberado
  const [logoUrl, setLogoUrl] = useState(conta.escritorios?.logo_url || "");
  const [corSistema, setCorSistema] = useState(conta.escritorios?.cor_sistema || "#c9a24b");
  const [salvandoLabel, setSalvandoLabel] = useState(false);
  const [removendo, setRemovendo] = useState(false);

  async function alternarTela(chave) {
    const base = permissoes === null ? TELAS.map((t) => t.chave) : permissoes;
    const novas = base.includes(chave) ? base.filter((c) => c !== chave) : [...base, chave];
    setPermissoes(novas); // otimista - painel é só do próprio admin, sem concorrência
    await atualizarPermissoes(conta.id, novas);
  }

  async function salvarWhiteLabel() {
    setSalvandoLabel(true);
    await atualizarWhiteLabel(conta.escritorio_id, logoUrl, corSistema);
    setSalvandoLabel(false);
  }

  async function remover() {
    if (!confirm(`Remover o acesso de ${conta.email}? Essa ação não pode ser desfeita.`)) return;
    setRemovendo(true);
    await removerConta(conta.id);
  }

  return (
    <div className="glass-panel" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <strong>{conta.nome}</strong>
          <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
            {conta.email} · {conta.escritorios?.nome}
          </p>
        </div>
        <button type="button" className="secundario" onClick={remover} disabled={removendo} style={{ flexShrink: 0 }}>
          {removendo ? "Removendo…" : "Remover acesso"}
        </button>
      </div>

      <div>
        <label style={{ marginBottom: "8px" }}>Telas liberadas</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {TELAS.map((tela) => {
            const marcado = permissoes === null || permissoes.includes(tela.chave);
            return (
              <button
                key={tela.chave}
                type="button"
                onClick={() => alternarTela(tela.chave)}
                className="badge"
                style={{
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: marcado ? "var(--accent)" : "var(--border)",
                  background: marcado ? "var(--accent-glow)" : "rgba(255,255,255,0.03)",
                  color: marcado ? "var(--accent)" : "var(--text-dim)",
                }}
              >
                {tela.label}
              </button>
            );
          })}
        </div>
        {permissoes === null && (
          <p style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "8px" }}>
            Sem restrição (acesso liberado em tudo) - clique numa tela pra passar a restringir.
          </p>
        )}
      </div>

      <div className="grade-campos grade-campos-2-1" style={{ alignItems: "end" }}>
        <label>
          Logo (URL)
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
        </label>
        <label>
          Cor do sistema
          <input type="color" value={corSistema} onChange={(e) => setCorSistema(e.target.value)} style={{ height: "42px", padding: "4px" }} />
        </label>
      </div>
      <button type="button" className="secundario" onClick={salvarWhiteLabel} disabled={salvandoLabel} style={{ alignSelf: "flex-start" }}>
        {salvandoLabel ? "Salvando…" : "Salvar logo e cor"}
      </button>
    </div>
  );
}

export default function AdminPainel({ contas }) {
  const [estado, acao] = useFormState(criarContaCliente, ESTADO_INICIAL);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div className="glass-panel" style={{ padding: "28px" }}>
        <h3 className="titulo-secao" style={{ marginBottom: "18px" }}>
          Criar acesso de cliente
        </h3>
        <form action={acao} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="grade-campos grade-campos-1-1">
            <label>
              E-mail do cliente
              <input type="email" name="email" required placeholder="cliente@escritorio.com.br" />
            </label>
            <label>
              Nome do responsável
              <input name="nomeAdvogado" required placeholder="Ex.: Dr. João Advocacia" />
            </label>
          </div>
          <label>
            Nome do escritório/cliente
            <input name="nomeEscritorio" required placeholder="Ex.: João Advocacia" />
          </label>
          <div className="grade-campos grade-campos-1-1">
            <label>
              Logo (URL, opcional)
              <input name="logoUrl" placeholder="https://…/logo.png" />
            </label>
            <label>
              Cor do sistema
              <input type="color" name="corSistema" defaultValue="#c9a24b" style={{ height: "42px", padding: "4px" }} />
            </label>
          </div>
          <div>
            <label style={{ marginBottom: "8px" }}>Telas liberadas</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {TELAS.map((tela) => (
                <label key={tela.chave} style={{ display: "flex", alignItems: "center", gap: "6px", textTransform: "none", letterSpacing: "normal", fontWeight: 400 }}>
                  <input type="checkbox" name="permissoes" value={tela.chave} style={{ width: "auto" }} />
                  {tela.label}
                </label>
              ))}
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "8px" }}>
              Nenhuma tela marcada = cliente entra mas não vê nada além de Configurações.
            </p>
          </div>
          {estado?.erro && <p className="erro">{estado.erro}</p>}
          <BotaoCriar />
        </form>

        {estado?.sucesso && (
          <div className="info" style={{ background: "var(--accent-glow)", padding: "14px", borderRadius: "8px", marginTop: "18px" }}>
            Conta criada — e-mail: <strong>{estado.email}</strong> · senha: <strong style={{ fontFamily: "monospace" }}>{estado.senha}</strong>
            <br />
            Essa senha só aparece aqui uma vez.
          </div>
        )}
      </div>

      <div>
        <h3 className="titulo-secao" style={{ marginBottom: "16px" }}>
          Contas ({contas.length})
        </h3>
        {contas.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>Nenhuma conta criada ainda.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {contas.map((conta) => (
              <ContaCard key={conta.id} conta={conta} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
