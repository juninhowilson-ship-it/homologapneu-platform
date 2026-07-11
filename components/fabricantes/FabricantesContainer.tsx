"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FabricantesTable from "./FabricantesTable";
import FabricanteFormModal from "./FabricanteFormModal";
import FabricanteDetailModal from "./FabricanteDetailModal";
import { useFabricantes, type FabricantesQuery } from "@/hooks/useFabricantes";
import { useExcluirFabricante } from "@/hooks/useFabricanteMutations";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { Fabricante } from "@/types/fabricante";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
];

const PAGE_SIZE = 10;

export default function FabricantesContainer() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<FabricantesQuery["status"]>("all");
  const [sortBy, setSortBy] = useState<FabricantesQuery["sortBy"]>("name");
  const [sortDir, setSortDir] = useState<FabricantesQuery["sortDir"]>("asc");
  const [page, setPage] = useState(1);

  const [formModal, setFormModal] = useState<{
    open: boolean;
    fabricante: Fabricante | null;
  }>({ open: false, fabricante: null });
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fabricante | null>(null);

  const query: FabricantesQuery = {
    q: debouncedSearch,
    status,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useFabricantes(query);
  const excluir = useExcluirFabricante();

  function handleSort(column: FabricantesQuery["sortBy"]) {
    if (sortBy === column) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
    setPage(1);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    excluir.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="w-64">
            <Input
              label="Buscar"
              placeholder="Nome ou país..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-48">
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              hidePlaceholder
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as FabricantesQuery["status"]);
                setPage(1);
              }}
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setFormModal({ open: true, fabricante: null })}
        >
          + Novo Fabricante
        </Button>
      </div>

      <FabricantesTable
        fabricantes={data?.data ?? []}
        isLoading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onView={(fabricante) => setDetailId(fabricante.id)}
        onEdit={(fabricante) => setFormModal({ open: true, fabricante })}
        onDelete={(fabricante) => setDeleteTarget(fabricante)}
      />

      {data && data.total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      <FabricanteFormModal
        open={formModal.open}
        fabricante={formModal.fabricante}
        onClose={() => setFormModal({ open: false, fabricante: null })}
      />

      <FabricanteDetailModal
        open={detailId !== null}
        id={detailId}
        onClose={() => setDetailId(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir fabricante"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.name}"? Esta ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Excluir"
        destructive
        loading={excluir.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
