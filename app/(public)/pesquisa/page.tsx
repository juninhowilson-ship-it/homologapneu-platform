import { Suspense } from "react";
import PesquisaContainer from "@/components/pesquisa/PesquisaContainer";

export default function PesquisaPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">
          Pesquisa Inteligente
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
          Digite um termo livre — marca, modelo, medida ou código de
          homologação — ou use os filtros avançados abaixo.
        </p>
      </div>

      <Suspense fallback={null}>
        <PesquisaContainer />
      </Suspense>
    </div>
  );
}
