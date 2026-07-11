import SearchBox from "@/components/pesquisa/SearchBox";
import FiltroPesquisa from "@/components/pesquisa/FiltroPesquisa";
import Resultados from "@/components/pesquisa/Resultados";

export default function PesquisaPage() {
  return (
    <main className="flex-1 bg-slate-100 p-10">

      <h1 className="text-4xl font-bold">
        Pesquisa Inteligente
      </h1>

      <p className="text-gray-500 mt-2 mb-8">
        Consulte homologações por veículo, medida ou fabricante.
      </p>

      <SearchBox />

      <FiltroPesquisa />

      <Resultados />

    </main>
  );
}