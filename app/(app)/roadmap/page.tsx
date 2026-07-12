import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  EPICS,
  STATUS_DOT,
  STATUS_LABEL,
  STATUS_TONE,
  calcularProgresso,
  formatarData,
} from "@/lib/roadmap-data";

export default function RoadmapPage() {
  const progresso = calcularProgresso(EPICS);

  return (
    <main className="p-10">
      <h1 className="text-4xl font-bold">Roadmap</h1>
      <p className="mt-3 text-muted-foreground">
        Linha do tempo do desenvolvimento do HomologaPneu.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500" /> Concluído
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-yellow-500" /> Em andamento
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-slate-400" /> Pendente
        </span>
        <span className="ml-auto font-semibold text-foreground">
          {progresso}% concluído
        </span>
      </div>

      <div className="relative mt-10 max-w-3xl space-y-10 border-l-2 border-border pl-8">
        {EPICS.map((epic) => (
          <div key={epic.id} className="relative">
            <span
              className={cn(
                "absolute -left-[41px] top-1 h-4 w-4 rounded-full border-4 border-surface-muted",
                STATUS_DOT[epic.status]
              )}
            />

            <p className="text-sm text-muted-foreground">
              {formatarData(epic.data)}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-bold">{epic.titulo}</h3>
              <Badge tone={STATUS_TONE[epic.status]}>
                {STATUS_LABEL[epic.status]}
              </Badge>
            </div>

            <p className="mt-2 text-muted-foreground">{epic.descricao}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
