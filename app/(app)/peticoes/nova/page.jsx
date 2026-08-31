import GerarPeticaoForm from "../../../../components/GerarPeticaoForm";

// Geração por IA pode passar de 10s facilmente (thinking + petição longa) -
// sem isso a função é cortada pelo limite padrão da Vercel bem antes de
// terminar. Nota: no plano Hobby a Vercel pode aplicar um teto menor que
// esse na prática, mesmo declarando um valor maior aqui.
export const maxDuration = 300;

export default function NovaPeticaoPage() {
  return (
    <>
      <h1 className="titulo-pagina">Nova petição</h1>
      <p className="subtitulo-pagina">
        A IA usa as petições-base cadastradas pra essa área do direito como referência de estilo.
      </p>
      <GerarPeticaoForm />
    </>
  );
}
