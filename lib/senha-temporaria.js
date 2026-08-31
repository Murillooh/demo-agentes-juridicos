import "server-only";

// 12 caracteres, sem ambíguos (0/O, 1/l/I) - fácil de ler/digitar numa tela,
// difícil de adivinhar. Usada só uma vez (advogado troca no 1º login).
// Extraído de app/onboarding/actions.js na Etapa 9 pra reusar sem duplicar
// no fluxo de acesso demo (app/demo/actions.js).
export function gerarSenhaTemporaria() {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let senha = "";
  for (let i = 0; i < 12; i++) senha += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return senha;
}
