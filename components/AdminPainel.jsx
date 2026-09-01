"use client";
import { useState, useEffect, useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { criarContaCliente, aprovarConta, recusarConta } from "../app/admin/actions";
import { TELAS } from "../lib/permissoes";
import TelaChip from "./TelaChip";
import ClienteCard from "./ClienteCard";
import ClienteModal from "./ClienteModal";

const ESTADO_INICIAL = { erro: "" };

function BotaoCriar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} style={{ padding: "12px 20px", fontSize: "14px" }}>
      {pending ? "Criando…" : "Criar acesso"}
    </button>
  );
}

function PendenteCard({ conta }) {
  const [selecao, setSelecao] = useState([]);
  const [processando, setProcessando] = useState(false);

  function alternarTela(chave) {
    setSelecao((atual) => (atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave]));
  }

  async function aprovar() {
    setProcessando(true);
    await aprovarConta(conta.id, selecao);
    setProcessando(false);
  }

  async function recusar() {
    if (!confirm(`Recusar e remover o cadastro de ${conta.email}?`)) return;
    setProcessando(true);
    await recusarConta(conta.id);
  }

  return (
    <div className="glass-panel" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "12px", borderColor: "var(--border-strong)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <strong>{conta.nome}</strong>
          <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "2px" }}>
            {conta.email} · {conta.escritorios?.nome}
          </p>
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
          pedido em {new Date(conta.criado_em).toLocaleDateString("pt-BR")}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {TELAS.map((tela) => (
          <TelaChip key={tela.chave} label={tela.label} marcado={selecao.includes(tela.chave)} onToggle={() => alternarTela(tela.chave)} />
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button type="button" onClick={aprovar} disabled={processando} style={{ padding: "8px 18px", fontSize: "13px" }}>
          {processando ? "Processando…" : "Aprovar"}
        </button>
        <button type="button" className="secundario" onClick={recusar} disabled={processando} style={{ padding: "8px 18px", fontSize: "13px" }}>
          Recusar
        </button>
      </div>
    </div>
  );
}

export default function AdminPainel({ contas }) {
  const [estado, acao] = useFormState(criarContaCliente, ESTADO_INICIAL);
  const [permissoesNovas, setPermissoesNovas] = useState([]);
  const [corNova, setCorNova] = useState("#c9a24b");
  const [busca, setBusca] = useState("");
  const [idSelecionado, setIdSelecionado] = useState(null);

  const pendentes = contas.filter((c) => c.aprovado === false);
  const aprovadas = contas.filter((c) => c.aprovado !== false);
  const contaSelecionada = aprovadas.find((c) => c.id === idSelecionado) || null;

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return aprovadas;
    return aprovadas.filter((c) =>
      [c.nome, c.email, c.escritorios?.nome].filter(Boolean).some((campo) => campo.toLowerCase().includes(termo))
    );
  }, [aprovadas, busca]);

  function alternarTelaNova(chave) {
    setPermissoesNovas((atual) => (atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave]));
  }

  // Form some após sucesso, mas o estado local do form (chips + cor) fica -
  // limpa junto pra próxima conta criada não começar com sobra da anterior.
  useEffect(() => {
    if (estado?.sucesso) {
      setPermissoesNovas([]);
      setCorNova("#c9a24b");
    }
  }, [estado?.sucesso]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {pendentes.length > 0 && (
        <div>
          <h3 className="titulo-secao" style={{ marginBottom: "16px" }}>
            Solicitações de Acesso ({pendentes.length})
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "16px" }}>
            Cadastro público (/onboarding) - escolha as telas e aprove, ou recuse.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {pendentes.map((conta) => (
              <PendenteCard key={conta.id} conta={conta} />
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: "32px", borderColor: "var(--border-strong)" }}>
        <h3 className="titulo-secao" style={{ marginBottom: "4px" }}>
          Criar acesso de cliente
        </h3>
        <p style={{ fontSize: "13px", color: "var(--text-dim)", marginBottom: "22px" }}>
          Cria o login e gera senha temporária - logo e cor dá pra ajustar depois, no card do cliente.
        </p>
        <form action={acao} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div className="grade-campos grade-campos-1-1-1">
            <label>
              E-mail do cliente
              <input type="email" name="email" required placeholder="cliente@escritorio.com.br" />
            </label>
            <label>
              Nome do responsável
              <input name="nomeAdvogado" required placeholder="Ex.: Dr. João Advocacia" />
            </label>
            <label>
              Nome do escritório/cliente
              <input name="nomeEscritorio" required placeholder="Ex.: João Advocacia" />
            </label>
          </div>

          <div className="grade-campos grade-campos-2-1">
            <label>
              Logo (URL, opcional)
              <input name="logoUrl" placeholder="https://…/logo.png" />
            </label>
            <label>
              Cor do sistema
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="color"
                  name="corSistema"
                  value={corNova}
                  onChange={(e) => setCorNova(e.target.value)}
                  style={{ height: "42px", width: "56px", padding: "4px", flexShrink: 0 }}
                />
                <span style={{ fontSize: "13px", color: "var(--text-dim)", fontFamily: "monospace" }}>{corNova}</span>
              </div>
            </label>
          </div>

          {/* Checkbox real fica invisível (display:none não tira do form) -
              quem o usuário vê e clica é o TelaChip logo abaixo, controlado
              pelo mesmo estado. */}
          <div style={{ display: "none" }}>
            {TELAS.map((tela) => (
              <input key={tela.chave} type="checkbox" name="permissoes" value={tela.chave} checked={permissoesNovas.includes(tela.chave)} readOnly />
            ))}
          </div>
          <div>
            <label style={{ marginBottom: "10px" }}>Telas liberadas</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {TELAS.map((tela) => (
                <TelaChip key={tela.chave} label={tela.label} marcado={permissoesNovas.includes(tela.chave)} onToggle={() => alternarTelaNova(tela.chave)} />
              ))}
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "10px" }}>
              Nenhuma tela marcada = cliente entra mas não vê nada além de Configurações.
            </p>
          </div>

          {estado?.erro && <p className="erro">{estado.erro}</p>}

          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "4px", borderTop: "1px solid var(--border)" }}>
            <div style={{ paddingTop: "18px" }}>
              <BotaoCriar />
            </div>
          </div>
        </form>

        {estado?.sucesso && (
          <div
            className="info"
            style={{ background: "var(--accent-glow)", border: "1px solid var(--border-strong)", padding: "16px", borderRadius: "8px", marginTop: "20px" }}
          >
            Conta criada — e-mail: <strong>{estado.email}</strong> · senha: <strong style={{ fontFamily: "monospace" }}>{estado.senha}</strong>
            <br />
            Essa senha só aparece aqui uma vez.
          </div>
        )}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
          <h3 className="titulo-secao">Contas ({aprovadas.length})</h3>
          {aprovadas.length > 0 && (
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail ou escritório…"
              style={{ maxWidth: "320px" }}
            />
          )}
        </div>

        {aprovadas.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>Nenhuma conta aprovada ainda.</p>
        ) : filtradas.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontSize: "14px" }}>Nenhuma conta bate com "{busca}".</p>
        ) : (
          <div className="clientes-grade">
            {filtradas.map((conta) => (
              <ClienteCard key={conta.id} conta={conta} onClick={() => setIdSelecionado(conta.id)} />
            ))}
          </div>
        )}
      </div>

      {contaSelecionada && <ClienteModal conta={contaSelecionada} aoFechar={() => setIdSelecionado(null)} />}
    </div>
  );
}
