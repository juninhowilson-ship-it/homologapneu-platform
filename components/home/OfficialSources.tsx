import type { MontadoraOficial } from "@/services/publico";

function Iniciais(nome: string) {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

export default function OfficialSources({
  montadoras,
}: {
  montadoras: MontadoraOficial[];
}) {
  if (montadoras.length === 0) return null;

  return (
    <section id="fontes-oficiais" className="bg-surface-muted py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-foreground">Fontes Oficiais</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Montadoras monitoradas continuamente pelo nosso crawler de
            documentos oficiais.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {montadoras.map((montadora) => (
            <div
              key={montadora.id}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-white p-5 transition hover:-translate-y-1 hover:shadow-md"
              title={montadora.name}
            >
              {montadora.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={montadora.logoUrl}
                  alt={montadora.name}
                  className="h-10 w-full object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                  {Iniciais(montadora.name)}
                </div>
              )}
              <p className="truncate text-center text-xs font-medium text-muted-foreground">
                {montadora.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
