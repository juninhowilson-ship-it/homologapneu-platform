import { Suspense } from "react";
import PesquisaContainer from "@/components/pesquisa/PesquisaContainer";

export default function PesquisaPage() {
  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold mb-8">Pesquisa</h1>

      <Suspense fallback={null}>
        <PesquisaContainer />
      </Suspense>
    </main>
  );
}
