"use client";
import { useFormState, useFormStatus } from "react-dom";
import { salvarConfiguracaoNotificacao, salvarTelefoneWhatsapp } from "../app/(app)/configuracoes/actions";

const ESTADO_INICIAL = { erro: "", sucesso: "" };

function BotaoSalvar({ children }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Salvando…" : children}
    </button>
  );
}

export default function NotificacoesConfigForm({ canalEmail, canalWhatsapp, telefoneWhatsapp }) {
  const [estadoCanal, acaoCanal] = useFormState(salvarConfiguracaoNotificacao, ESTADO_INICIAL);
  const [estadoTelefone, acaoTelefone] = useFormState(salvarTelefoneWhatsapp, ESTADO_INICIAL);

  return (
    <div className="glass-panel" style={{ padding: "28px" }}>
      <h3 className="titulo-secao" style={{ marginBottom: "20px" }}>
        Notificações
      </h3>

      <form action={acaoCanal} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <p style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "none", letterSpacing: "normal", fontWeight: 400 }}>
          Canal usado pra avisar de prazo novo e atualização do Diário Oficial - vale pra todo o escritório.
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", textTransform: "none", letterSpacing: "normal" }}>
          <input type="checkbox" name="canalEmail" defaultChecked={canalEmail} style={{ width: "auto" }} />
          E-mail
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", textTransform: "none", letterSpacing: "normal" }}>
          <input type="checkbox" name="canalWhatsapp" defaultChecked={canalWhatsapp} style={{ width: "auto" }} />
          WhatsApp
        </label>
        {estadoCanal?.erro && <p className="erro">{estadoCanal.erro}</p>}
        {estadoCanal?.sucesso && <p className="info">{estadoCanal.sucesso}</p>}
        <BotaoSalvar>Salvar canais</BotaoSalvar>
      </form>

      <div style={{ borderTop: "1px solid var(--border)", margin: "24px 0" }} />

      <form action={acaoTelefone} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <label>
          Seu WhatsApp (formato internacional)
          <input name="telefone" defaultValue={telefoneWhatsapp || ""} placeholder="+5511999998888" />
        </label>
        <p style={{ fontSize: "12px", color: "var(--text-dim)", textTransform: "none", letterSpacing: "normal", fontWeight: 400 }}>
          Só recebe WhatsApp quem preencher o número aqui, mesmo com o canal ativo acima.
        </p>
        {estadoTelefone?.erro && <p className="erro">{estadoTelefone.erro}</p>}
        {estadoTelefone?.sucesso && <p className="info">{estadoTelefone.sucesso}</p>}
        <BotaoSalvar>Salvar número</BotaoSalvar>
      </form>
    </div>
  );
}
