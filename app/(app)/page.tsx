import DashboardContainer from "@/components/dashboard/DashboardContainer";

export default function HomePage() {
  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold">Dashboard Executivo</h1>
      <p className="mt-2 mb-8 text-muted-foreground">
        Visão geral em tempo real do HomologaPneu.
      </p>

      <DashboardContainer />
    </main>
  );
}
