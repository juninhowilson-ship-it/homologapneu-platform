import PrioridadesContainer from "@/components/prioridades/PrioridadesContainer";

export const metadata = {
  title: "Prioridade de Homologação",
};

export default function PrioridadesPage() {
  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold">Prioridade de Homologação</h1>
      <p className="mt-2 mb-8 max-w-3xl text-muted-foreground">
        A fila de homologações organizada por ano do veículo, do mais recente
        para o mais antigo — para fechar um ano antes de passar ao próximo.
      </p>

      <PrioridadesContainer />
    </main>
  );
}
