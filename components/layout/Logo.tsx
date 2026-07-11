export default function Logo() {
  return (
    <div className="flex items-center gap-3">

      <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center font-bold text-brand-foreground">
        HP
      </div>

      <div>

        <h1 className="text-xl font-bold text-white">
          HomologaPneu
        </h1>

        <p className="text-xs text-gray-400">
          Plataforma Inteligente
        </p>

      </div>

    </div>
  );
}