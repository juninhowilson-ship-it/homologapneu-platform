import type { EventoTimelineVeiculo } from "@/services/publico";

const ACAO_LABEL: Record<string, string> = {
  CREATE: "Criado",
  UPDATE: "Atualizado",
  DELETE: "Excluído",
};

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export default function TimelineVeiculo({
  eventos,
}: {
  eventos: EventoTimelineVeiculo[];
}) {
  if (eventos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum evento de auditoria registrado para este veículo ainda.
      </p>
    );
  }

  return (
    <div className="relative space-y-6 border-l-2 border-border pl-6">
      {eventos.map((evento) => (
        <div key={evento.id} className="relative">
          <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-brand" />
          <p className="text-sm text-muted-foreground">
            {formatarDataHora(evento.quando)}
          </p>
          <p className="font-semibold text-foreground">
            {ACAO_LABEL[evento.acao] ?? evento.acao}
            {evento.quem ? ` por ${evento.quem}` : ""}
          </p>
          {evento.mudancas && (
            <pre className="mt-1 max-w-xl overflow-x-auto rounded bg-surface-muted p-2 text-xs">
              {evento.mudancas}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
