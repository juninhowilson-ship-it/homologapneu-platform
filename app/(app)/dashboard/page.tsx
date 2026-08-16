import DashboardContainer from "@/components/dashboard/DashboardContainer";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
          HomologaPneu
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-foreground">
          Qual pneu é homologado para cada veículo
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Consulte medidas aprovadas pela montadora, com rastreabilidade até o
          documento de origem.
        </p>
      </header>

      <DashboardContainer />
    </main>
  );
}
