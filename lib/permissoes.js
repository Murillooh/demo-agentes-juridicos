// Puro - sem next/headers (mesmo motivo de lib/admin.js). Telas do sistema
// que dá pra restringir por conta - a chave é o que fica salvo em
// advogados.permissoes (array de chaves). Sidebar usa pra esconder link,
// middleware usa pra bloquear a rota direta (mesmo raciocínio do sistema
// anterior, só que centralizado em middleware.js em vez de um componente
// AcessoGuard client-side - mais difícil de contornar).
export const TELAS = [
  { chave: "dashboard", label: "Início", href: "/dashboard" },
  { chave: "peticoes", label: "Petições", href: "/peticoes" },
  { chave: "board", label: "Board", href: "/board" },
  { chave: "peticoes-base", label: "Petições-base", href: "/peticoes-base" },
  { chave: "agenda", label: "Agenda", href: "/agenda" },
  { chave: "prazos", label: "Prazos", href: "/prazos" },
  { chave: "processos", label: "Processos", href: "/processos" },
  { chave: "contratos", label: "Contratos", href: "/contratos" },
  { chave: "atualizacoes", label: "Diário Oficial", href: "/atualizacoes" },
  { chave: "notificacoes", label: "Notificações", href: "/notificacoes" },
  { chave: "integracoes", label: "Integrações", href: "/integracoes" },
];

// null = acesso liberado em tudo - padrão de quem passou por /onboarding ou
// /demo (mesmo comportamento de sempre, ninguém perde acesso por causa
// dessa feature existir agora). Só fica restrito quem o admin criou em
// /admin com uma lista explícita.
export function telaPermitida(pathname, permissoes) {
  if (!permissoes) return true;
  const tela = TELAS.find((t) => pathname === t.href || pathname.startsWith(t.href + "/"));
  if (!tela) return true; // /configuracoes e outras rotas fora da lista nunca são restritas
  return permissoes.includes(tela.chave);
}

export function primeiraTelaPermitida(permissoes) {
  if (!permissoes) return "/dashboard";
  const tela = TELAS.find((t) => permissoes.includes(t.chave));
  return tela?.href || "/configuracoes";
}
