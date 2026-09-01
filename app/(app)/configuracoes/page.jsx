import { criarClienteSupabaseServidor, obterUsuario } from "../../../lib/supabase/server";
import ConfiguracoesForm from "../../../components/ConfiguracoesForm";
import NotificacoesConfigForm from "../../../components/NotificacoesConfigForm";

export default async function ConfiguracoesPage() {
  const supabase = criarClienteSupabaseServidor();
  const user = await obterUsuario(supabase);

  const { data: advogado } = await supabase
    .from("advogados")
    .select("escritorio_id, telefone_whatsapp, escritorios(nome, logo_url)")
    .eq("id", user.id)
    .maybeSingle();

  const { data: configNotificacao } = await supabase
    .from("configuracoes_notificacao")
    .select("canal_email, canal_whatsapp")
    .eq("escritorio_id", advogado?.escritorio_id)
    .maybeSingle();

  return (
    <>
      <h1 className="titulo-pagina">Configurações</h1>
      <p className="subtitulo-pagina">Identidade visual usada nas petições exportadas e canais de notificação.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 620px))", gap: "24px", alignItems: "start" }}>
        <ConfiguracoesForm nome={advogado?.escritorios?.nome} logoUrl={advogado?.escritorios?.logo_url} />
        <NotificacoesConfigForm
          canalEmail={configNotificacao ? configNotificacao.canal_email : true}
          canalWhatsapp={configNotificacao ? configNotificacao.canal_whatsapp : false}
          telefoneWhatsapp={advogado?.telefone_whatsapp}
        />
      </div>
    </>
  );
}
