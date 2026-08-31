import { notFound } from "next/navigation";
import { criarClienteSupabaseServidor, obterUsuario } from "../../../../lib/supabase/server";
import ReanalisarContratoButton from "../../../../components/ReanalisarContratoButton";

function SecaoResultado({ titulo, children, destaque }) {
  return (
    <div className="glass-panel" style={{ padding: "24px 28px", borderColor: destaque ? "var(--danger)" : undefined }}>
      <h3 className="titulo-secao" style={{ marginBottom: "14px" }}>
        {titulo}
      </h3>
      {children}
    </div>
  );
}

export default async function ContratoPage({ params }) {
  const supabase = criarClienteSupabaseServidor();
  await obterUsuario(supabase);

  const { data: contrato } = await supabase
    .from("contratos")
    .select(
      "id, nome_arquivo, status, erro, criado_em, partes, objeto, vigencia, clausula_multa_rescisao, pontos_atencao, texto_truncado_na_analise, advogados(nome)"
    )
    .eq("id", params.id)
    .maybeSingle();

  // RLS já barra contrato de outro escritório - null cobre "não existe" e
  // "não é meu" igual, sem diferenciar resposta.
  if (!contrato) notFound();

  return (
    <>
      <h1 className="titulo-pagina">{contrato.nome_arquivo}</h1>
      <p className="subtitulo-pagina">
        Enviado por {contrato.advogados?.nome} em {new Date(contrato.criado_em).toLocaleString("pt-BR")}
      </p>

      <div
        className="info"
        style={{
          background: "var(--accent-glow)",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        ⚠️ Leitura assistida por IA — não é parecer jurídico definitivo. Confira o texto original antes de qualquer decisão.
      </div>

      <div style={{ marginBottom: "24px" }}>
        <a href={`/api/contratos/${contrato.id}/arquivo`} target="_blank" rel="noopener noreferrer">
          <button type="button" className="secundario">
            Ver arquivo original
          </button>
        </a>
      </div>

      {contrato.status === "sem_texto" && (
        <div className="glass-panel" style={{ padding: "32px", color: "var(--text-dim)", lineHeight: 1.6 }}>
          Não foi possível extrair texto deste arquivo - provavelmente é um documento escaneado (imagem, sem camada
          de texto). Leitura por OCR ainda não existe nesta versão.
        </div>
      )}

      {contrato.status === "falha" && (
        <div className="glass-panel" style={{ padding: "32px" }}>
          <p className="erro" style={{ marginBottom: "16px" }}>
            {contrato.erro || "Falha ao analisar o contrato."}
          </p>
          <ReanalisarContratoButton id={contrato.id} />
        </div>
      )}

      {contrato.status === "processando" && (
        <div className="glass-panel" style={{ padding: "32px", color: "var(--text-dim)" }}>
          Ainda processando…
        </div>
      )}

      {contrato.status === "concluido" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "820px" }}>
          <SecaoResultado titulo="Partes envolvidas">
            {contrato.partes?.length ? (
              <ul style={{ paddingLeft: "20px", lineHeight: 1.8 }}>
                {contrato.partes.map((p, i) => (
                  <li key={i}>
                    <strong>{p.nome}</strong> — {p.papel}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--text-dim)" }}>Não identificadas.</p>
            )}
          </SecaoResultado>

          <SecaoResultado titulo="Objeto do contrato">
            <p style={{ lineHeight: 1.6 }}>{contrato.objeto || "Não identificado."}</p>
          </SecaoResultado>

          <SecaoResultado titulo="Prazo / Vigência">
            <p style={{ lineHeight: 1.6 }}>{contrato.vigencia || "Não identificado."}</p>
          </SecaoResultado>

          <SecaoResultado titulo="Multa e Rescisão">
            <p style={{ lineHeight: 1.6 }}>{contrato.clausula_multa_rescisao || "Não identificado."}</p>
          </SecaoResultado>

          <SecaoResultado titulo="Pontos de atenção" destaque={contrato.pontos_atencao?.length > 0}>
            {contrato.pontos_atencao?.length ? (
              <ul style={{ paddingLeft: "20px", lineHeight: 1.8 }}>
                {contrato.pontos_atencao.map((ponto, i) => (
                  <li key={i}>{ponto}</li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--text-dim)" }}>Nenhum ponto de atenção identificado.</p>
            )}
          </SecaoResultado>

          {contrato.texto_truncado_na_analise && (
            <p style={{ fontSize: "12px", color: "var(--text-dim)" }}>
              Contrato longo — a análise considerou só os primeiros trechos do texto.
            </p>
          )}

          <div>
            <ReanalisarContratoButton id={contrato.id} rotulo="Analisar de novo" />
          </div>
        </div>
      )}
    </>
  );
}
