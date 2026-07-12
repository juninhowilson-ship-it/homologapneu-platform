import CentroTecnicoContainer from "@/components/centro-tecnico/CentroTecnicoContainer";

export default function CentroTecnicoPage() {
  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold">Centro Técnico</h1>

      <p className="mt-3 mb-8 text-muted-foreground">
        Consulte a ficha técnica completa por veículo ou por pneu.
      </p>

      <CentroTecnicoContainer />
    </main>
  );
}
