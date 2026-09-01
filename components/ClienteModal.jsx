"use client";
import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { atualizarInfoCliente, uploadLogoCliente, atualizarPermissoes, removerConta } from "../app/admin/actions";
import { TELAS } from "../lib/permissoes";
import { formatarVistoPorUltimo, estaOnline } from "../lib/tempo";
import TelaChip from "./TelaChip";

function BotaoUpload() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="secundario" disabled={pending} style={{ fontSize: "13px", padding: "9px 16px", flexShrink: 0 }}>
      {pending ? "Enviando…" : "Trocar logo"}
    </button>
  );
}

// Popup de detalhe/edição de um cliente já aprovado (Etapa 11) - abre ao
// clicar no card em AdminPainel. Reúne o que antes ficava espalhado inline
// em cada card da lista (logo por URL, cor, telas) num só lugar, mais
// upload de arquivo de verdade e "visto por último".
export default function ClienteModal({ conta, aoFechar }) {
  const [nome, setNome] = useState(conta.escritorios?.nome || "");
  const [corSistema, setCorSistema] = useState(conta.escritorios?.cor_sistema || "#c9a24b");
  const [logoUrl, setLogoUrl] = useState(conta.escritorios?.logo_url || "");
  const [permissoes, setPermissoes] = useState(conta.permissoes);
  const [salvandoInfo, setSalvandoInfo] = useState(false);
  const [removendo, setRemovendo] = useState(false);

  const [estadoUpload, acaoUpload] = useFormState(uploadLogoCliente.bind(null, conta.escritorio_id), {});

  useEffect(() => {
    if (estadoUpload?.logoUrl) setLogoUrl(estadoUpload.logoUrl);
  }, [estadoUpload]);

  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === "Escape") aoFechar();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  async function alternarTela(chave) {
    const base = permissoes === null ? TELAS.map((t) => t.chave) : permissoes;
    const novas = base.includes(chave) ? base.filter((c) => c !== chave) : [...base, chave];
    setPermissoes(novas); // otimista - painel é só do próprio admin, sem concorrência
    await atualizarPermissoes(conta.id, novas);
  }

  async function salvarInfo() {
    setSalvandoInfo(true);
    await atualizarInfoCliente(conta.escritorio_id, nome, corSistema);
    setSalvandoInfo(false);
  }

  async function remover() {
    if (!confirm(`Remover o acesso de ${conta.email}? Essa ação não pode ser desfeita.`)) return;
    setRemovendo(true);
    const resultado = await removerConta(conta.id);
    setRemovendo(false);
    if (resultado?.sucesso) aoFechar();
  }

  const online = estaOnline(conta.ultimo_acesso);
  const inicial = (conta.escritorios?.nome || conta.nome || "?").charAt(0).toUpperCase();

  return (
    <div className="tour-fundo" onClick={aoFechar}>
      <div className="glass-panel tour-modal" style={{ padding: "32px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                style={{ width: "56px", height: "56px", borderRadius: "12px", objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "12px",
                  background: "var(--accent-glow)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {inicial}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "20px", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {conta.escritorios?.nome}
              </h2>
              <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
                {conta.nome} · {conta.email}
              </p>
            </div>
          </div>
          <button type="button" className="secundario" onClick={aoFechar} aria-label="Fechar" style={{ padding: "6px 11px", flexShrink: 0 }}>
            ✕
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            marginBottom: "26px",
            fontSize: "12px",
            fontWeight: 600,
            color: online ? "var(--accent)" : "var(--text-dim)",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: online ? "var(--accent)" : "var(--text-dim)",
              boxShadow: online ? "0 0 8px var(--accent)" : "none",
            }}
          />
          {formatarVistoPorUltimo(conta.ultimo_acesso)}
        </div>

        <div style={{ marginBottom: "22px" }}>
          <label style={{ marginBottom: "8px" }}>Logo</label>
          <form action={acaoUpload} style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <input type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" required style={{ flex: "1 1 200px" }} />
            <BotaoUpload />
          </form>
          {estadoUpload?.erro && (
            <p className="erro" style={{ marginTop: "8px", fontSize: "12px" }}>
              {estadoUpload.erro}
            </p>
          )}
        </div>

        <div className="grade-campos grade-campos-2-1" style={{ marginBottom: "14px", alignItems: "end" }}>
          <label>
            Nome do escritório
            <input value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
          <label>
            Cor do sistema
            <input type="color" value={corSistema} onChange={(e) => setCorSistema(e.target.value)} style={{ height: "42px", padding: "4px" }} />
          </label>
        </div>
        <button type="button" className="secundario" onClick={salvarInfo} disabled={salvandoInfo} style={{ marginBottom: "26px" }}>
          {salvandoInfo ? "Salvando…" : "Salvar nome e cor"}
        </button>

        <div style={{ marginBottom: "10px" }}>
          <label style={{ marginBottom: "10px" }}>Telas liberadas</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {TELAS.map((tela) => (
              <TelaChip
                key={tela.chave}
                label={tela.label}
                marcado={permissoes === null || permissoes.includes(tela.chave)}
                onToggle={() => alternarTela(tela.chave)}
              />
            ))}
          </div>
          {permissoes === null && (
            <p style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "8px" }}>
              Sem restrição (acesso liberado em tudo) - clique numa tela pra passar a restringir.
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "20px",
            paddingTop: "18px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>Cadastrado em {new Date(conta.criado_em).toLocaleDateString("pt-BR")}</span>
          <button
            type="button"
            className="secundario"
            onClick={remover}
            disabled={removendo}
            style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
          >
            {removendo ? "Removendo…" : "Remover acesso"}
          </button>
        </div>
      </div>
    </div>
  );
}
