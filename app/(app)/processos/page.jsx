import Link from "next/link";
import BuscaProcessoForm from "../../../components/BuscaProcessoForm";

export default function ProcessosPage() {
  return (
    <>
      <h1 className="titulo-pagina">Buscar Processo</h1>
      <p className="subtitulo-pagina">
        Consulta direto no DataJud (CNJ) pelo número do processo.{" "}
        <Link href="/processos/acompanhamento" style={{ color: "var(--accent)" }}>
          Ver processos acompanhados →
        </Link>
      </p>
      <BuscaProcessoForm />
    </>
  );
}
