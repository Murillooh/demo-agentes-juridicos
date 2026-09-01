"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "../app/login/actions";

const ITENS_NAV = [
  { href: "/dashboard", label: "Início", chave: "dashboard" },
  { href: "/peticoes/nova", label: "Nova Petição", chave: "peticoes" },
  { href: "/peticoes", label: "Petições", chave: "peticoes" },
  { href: "/board", label: "Board", chave: "board" },
  { href: "/peticoes-base", label: "Petições-base", chave: "peticoes-base" },
  { href: "/agenda", label: "Agenda", chave: "agenda" },
  { href: "/prazos/novo", label: "Identificar Prazo", chave: "prazos" },
  { href: "/processos", label: "Buscar Processo", chave: "processos" },
  { href: "/processos/acompanhamento", label: "Acompanhamento", chave: "processos" },
  { href: "/contratos", label: "Contratos", chave: "contratos" },
  { href: "/atualizacoes", label: "Diário Oficial", chave: "atualizacoes" },
  { href: "/notificacoes", label: "Notificações", chave: "notificacoes" },
  { href: "/integracoes", label: "Integrações", chave: "integracoes" },
  { href: "/configuracoes", label: "Configurações", chave: null }, // nunca restrito, igual lib/permissoes.js
];

function iniciais(nome, email) {
  const base = (nome || email || "?").trim();
  const partes = base.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

// permissoes: null = tudo liberado (padrão), array = só o que estiver
// listado - mesma semântica de lib/permissoes.js. Filtro aqui é só
// cosmético (esconde o link); o bloqueio de verdade é no middleware, que
// não dá pra contornar digitando a URL direto.
export default function Sidebar({ nome, email, nomeEscritorio, permissoes, ehPreviewAdmin }) {
  const pathname = usePathname();
  const itensVisiveis = ITENS_NAV.filter((item) => !item.chave || !permissoes || permissoes.includes(item.chave));

  return (
    <aside className="sidebar">
      <div className="sidebar-topo">
        {ehPreviewAdmin ? (
          // Sem isso essa conta fixa de visualização (lib/admin.js) fica
          // idêntica a estar logado como um advogado de verdade - fácil de
          // esquecer que é só um teste. Não tem "voltar" automático (a
          // action não guarda a senha do admin) - só avisa como sair.
          <div style={{ background: "var(--accent-glow)", border: "1px solid var(--border-strong)", borderRadius: "8px", padding: "10px 12px", marginBottom: "10px" }}>
            <span className="badge" style={{ marginBottom: "4px" }}>
              Modo visualização
            </span>
            <p style={{ fontSize: "11px", color: "var(--text-dim)", lineHeight: 1.4 }}>Pra voltar, saia e entre com seu login de admin.</p>
          </div>
        ) : (
          <span className="badge">{nomeEscritorio}</span>
        )}
        <h1 className="sidebar-marca">Plataforma Jurídica</h1>
      </div>

      <nav className="sidebar-nav">
        {itensVisiveis.map((item) => (
          <Link key={item.href} href={item.href} className={pathname === item.href ? "ativo" : ""}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-rodape">
        <div className="sidebar-perfil">
          <span className="sidebar-avatar">{iniciais(nome, email)}</span>
          <span className="sidebar-perfil-info">
            <strong>{nome || "Minha conta"}</strong>
            <span>{email}</span>
          </span>
        </div>
        <form action={sair}>
          <button type="submit" className="secundario" style={{ width: "100%" }}>
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
