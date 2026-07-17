"use client";

import { AlertTriangle, Clock, Search } from "lucide-react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { MEDIA_TYPE_LABELS, MEDIA_STATUS_LABELS } from "./mediaLabels";
import type { MediaQuery } from "@/hooks/useMedia";

type Props = {
  filtros: MediaQuery;
  onChange: (filtros: MediaQuery) => void;
};

export default function MediaFiltros({ filtros, onChange }: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow sm:flex-row sm:items-end sm:flex-wrap">
      <div className="flex-1 min-w-[220px]">
        <Input
          label="Pesquisar"
          placeholder="Título, descrição ou fonte..."
          value={filtros.q ?? ""}
          onChange={(e) => onChange({ ...filtros, q: e.target.value, page: 1 })}
        />
      </div>

      <div className="w-full sm:w-48">
        <Select
          label="Tipo"
          value={filtros.type ?? ""}
          onChange={(e) => onChange({ ...filtros, type: e.target.value || undefined, page: 1 })}
          options={Object.entries(MEDIA_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>

      <div className="w-full sm:w-48">
        <Select
          label="Status"
          value={filtros.status ?? ""}
          onChange={(e) => onChange({ ...filtros, status: e.target.value || undefined, page: 1 })}
          options={Object.entries(MEDIA_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            onChange({ ...filtros, status: filtros.status === "PENDENTE" ? undefined : "PENDENTE", page: 1 })
          }
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
            filtros.status === "PENDENTE"
              ? "bg-brand text-brand-foreground"
              : "bg-surface-muted text-foreground hover:bg-border"
          }`}
        >
          <Clock size={15} />
          Pendentes
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...filtros, onlyDuplicates: !filtros.onlyDuplicates, page: 1 })}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
            filtros.onlyDuplicates
              ? "bg-brand text-brand-foreground"
              : "bg-surface-muted text-foreground hover:bg-border"
          }`}
        >
          <AlertTriangle size={15} />
          Duplicadas
        </button>
      </div>

      {(filtros.type || filtros.status || filtros.onlyDuplicates || filtros.q) && (
        <button
          type="button"
          onClick={() => onChange({ page: 1, pageSize: filtros.pageSize })}
          className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <Search size={14} />
          Limpar filtros
        </button>
      )}
    </div>
  );
}
