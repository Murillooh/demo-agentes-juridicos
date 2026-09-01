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

// Conta fixa (1 só, reaproveitada) que o admin usa pra "ver como advogado"
// - vive no escritório is_demo=true (mesmo sandbox compartilhado do fluxo
// público /demo, já populado com petições/prazos/contratos de exemplo, ver
// 009_demo_e_tour.sql e app/demo/actions.js). Ver "entrarComoAdvogado" em
// app/admin/actions.js. E-mail fixo (não é um e-mail real, ninguém faz
// login manual com ele) pra achar/reaproveitar sempre a mesma linha em vez
// de criar uma conta nova a cada clique.
export const EMAIL_PREVIEW_ADVOGADO = "visualizacao.admin@plataforma-juridica.interno";

export function souPreviewAdmin(email) {
  return !!email && email.toLowerCase() === EMAIL_PREVIEW_ADVOGADO;
}
