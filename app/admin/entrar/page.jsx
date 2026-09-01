import { redirect } from "next/navigation";
import { usuarioAdminDaRequisicao } from "../../../lib/admin-servidor";
import EntrarComoAdvogadoAutomatico from "../../../components/EntrarComoAdvogadoAutomatico";

// Pra onde o login de admin cai agora (ver redirect em app/login/actions.js
// e o "rotaPublica && user" de middleware.js) - entra direto como a conta
// de visualização (mesma troca de "Ver como advogado", só automática),
// então o admin já abre no /dashboard vendo tudo que o advogado vê. /admin
// de verdade fica atrás do botão "Painel do administrador" em
// Configurações (usa a sessão guardada por entrarComoAdvogado pra voltar).
//
// A troca em si roda no client (EntrarComoAdvogadoAutomatico) - chamar
// entrarComoAdvogado() direto aqui no render quebra ("cookies().set()" só
// vale dentro de invocação real de Server Action, não de await solto num
// Server Component).
export default async function EntrarComoAdvogadoAutomaticoPage() {
  const admin = await usuarioAdminDaRequisicao();
  if (!admin) redirect("/");

  return <EntrarComoAdvogadoAutomatico />;
}
