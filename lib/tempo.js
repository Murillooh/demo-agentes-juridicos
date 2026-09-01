// Puro - sem next/headers, roda tanto em Server quanto Client Component
// (mesmo motivo documentado em lib/admin.js).

// "Online" é um proxy simples (ultimo_acesso recente), não presença em
// tempo real - ver 013_logo_upload_e_ultimo_acesso.sql.
const JANELA_ONLINE_MS = 5 * 60 * 1000;

export function estaOnline(ultimoAcesso) {
  if (!ultimoAcesso) return false;
  return Date.now() - new Date(ultimoAcesso).getTime() < JANELA_ONLINE_MS;
}

export function formatarVistoPorUltimo(ultimoAcesso) {
  if (!ultimoAcesso) return "Nunca acessou";
  if (estaOnline(ultimoAcesso)) return "Online agora";

  const diffMs = Date.now() - new Date(ultimoAcesso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 60) return `Visto há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `Visto há ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias < 30) return `Visto há ${dias}d`;
  return `Visto em ${new Date(ultimoAcesso).toLocaleDateString("pt-BR")}`;
}
