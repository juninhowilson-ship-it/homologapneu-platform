import RelatoriosContainer from "@/components/relatorios/RelatoriosContainer";

export default function RelatoriosPage() {
  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold no-print">Relatórios</h1>

      <p className="mt-3 text-muted-foreground no-print">
        Filtre as homologações e exporte o relatório em Excel ou PDF.
      </p>

      <div className="mt-8">
        <RelatoriosContainer />
      </div>
    </main>
  );
}
