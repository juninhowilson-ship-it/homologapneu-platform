import HeroSearch from "./HeroSearch";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-header">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-brand/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center">
        <span className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand">
          Consulta pública e gratuita
        </span>

        <h1 className="animate-fade-in-up mt-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
          Homologa<span className="text-brand">Pneu</span>
        </h1>

        <p className="animate-fade-in-up mt-4 text-lg text-white/70 sm:text-xl">
          Banco Oficial Brasileiro de Homologações de Pneus.
        </p>

        <div className="animate-fade-in-up mt-10">
          <HeroSearch />
        </div>
      </div>
    </section>
  );
}
