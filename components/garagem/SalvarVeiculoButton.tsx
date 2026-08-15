"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIdsGaragem, useToggleGaragem } from "@/hooks/useGaragem";

type Props = {
  vehicleVersionId: number;
  /** "botao" = botão com rótulo (página de veículo); "icone" = só o coração */
  variante?: "botao" | "icone";
  className?: string;
};

export default function SalvarVeiculoButton({
  vehicleVersionId,
  variante = "botao",
  className,
}: Props) {
  const { data: ids } = useIdsGaragem();
  const toggle = useToggleGaragem();

  const salvo = ids?.includes(vehicleVersionId) ?? false;

  function onClick() {
    toggle.mutate({ vehicleVersionId, salvar: !salvo });
  }

  if (variante === "icone") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={toggle.isPending}
        aria-label={salvo ? "Remover da garagem" : "Salvar na garagem"}
        title={salvo ? "Remover da garagem" : "Salvar na garagem"}
        className={cn(
          "rounded-lg p-2 transition hover:bg-surface-secondary disabled:opacity-50",
          salvo ? "text-brand" : "text-muted-foreground hover:text-foreground",
          className
        )}
      >
        <Heart size={18} fill={salvo ? "currentColor" : "none"} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={toggle.isPending}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:opacity-50",
        salvo
          ? "border-brand bg-brand/10 text-brand"
          : "border-border bg-surface text-foreground hover:border-brand/50",
        className
      )}
    >
      <Heart size={16} fill={salvo ? "currentColor" : "none"} />
      {salvo ? "Na garagem" : "Salvar Veículo"}
    </button>
  );
}
