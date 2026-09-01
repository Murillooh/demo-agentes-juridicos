// Puro - sem import de next/headers nem de nada server-only. Componente
// client (Sidebar, painel admin) importa daqui direto; qualquer import
// server-only nesse arquivo contaminava o bundle do client inteiro (bug de
// build real já visto no demo-agentes-juridicos: ver lib/admin-servidor.js).

// E-mail com acesso ao painel administrativo (/admin) - criação de conta de
// cliente (escritório novo), permissão por tela, logo e cor. Lista fixa no
// código (só o dono usa); se precisar de mais de um admin no futuro, vira
// coluna no banco em vez de lista fixa.
export const ADMIN_EMAILS = ["muurisattos@gmail.com"];

export function souAdmin(email) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}
