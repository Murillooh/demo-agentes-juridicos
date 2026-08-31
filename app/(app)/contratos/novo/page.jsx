import ContratoUploadForm from "../../../../components/ContratoUploadForm";

// Upload + extração de texto + chamada da IA, tudo síncrono na mesma
// Server Action (enviarContrato) - contrato mais longo pode levar bem mais
// que o default de execução. Mesmo padrão de /board e /atualizacoes.
export const maxDuration = 120;

export default function NovoContratoPage() {
  return (
    <>
      <h1 className="titulo-pagina">Analisar Contrato</h1>
      <p className="subtitulo-pagina">
        Envie um PDF ou DOCX - a IA identifica partes, objeto, vigência, multa/rescisão e pontos de atenção.
      </p>
      <ContratoUploadForm />
    </>
  );
}
