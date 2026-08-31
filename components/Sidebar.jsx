"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "../app/login/actions";

const ITENS_NAV = [
  { href: "/dashboard", label: "Início" },
  { href: "/peticoes/nova", label: "Nova Petição" },
  { href: "/peticoes", label: "Petições" },
  { href: "/peticoes-base", label: "Petições-base" },
  { href: "/agenda", label: "Agenda" },
  { href: "/prazos/novo", label: "Identificar Prazo" },
  { href: "/atualizacoes", label: "Diário Oficial" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/configuracoes", label: "Configurações" },
];

function iniciais(nome, email) {
  const base = (nome || email || "?").trim();
  const partes = base.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export default function Sidebar({ nome, email, nomeEscritorio }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-topo">
        <span className="badge">{nomeEscritorio}</span>
        <h1 className="sidebar-marca">Plataforma Jurídica</h1>
      </div>

      <nav className="sidebar-nav">
        {ITENS_NAV.map((item) => (
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
