import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Mesmo padrão de degradação do resto do projeto (Supabase, service role):
// sem a env var, devolve null e quem chama mostra erro claro em vez de
// travar a rota com exceção.
export function criarClienteAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic();
}
