"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import VeiculosTable from "./VeiculosTable";
import VeiculoFormModal from "./VeiculoFormModal";
import VeiculoDetailModal from "./VeiculoDetailModal";
import ImportCsvModal from "./ImportCsvModal";
import { useVeiculos, type VeiculosQuery } from "@/hooks/useVeiculos";
import { useExcluirVeiculo } from "@/hooks/useVeiculoMutations";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useManufacturers } from "@/hooks/useManufacturers";
import {
  FUEL_TYPES,
  FUEL_LABELS,
  VEHICLE_CATEGORIES,
  CATEGORY_LABELS,
  VEHICLE_SEGMENTS,
  SEGMENT_LABELS,
} from "@/lib/constants/veiculo";
import type { Veiculo } from "@/types/veiculo";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
];

const FUEL_OPTIONS = FUEL_TYPES.map((value) => ({
  value,
  label: FUEL_LABELS[value],
}));

const CATEGORY_OPTIONS = VEHICLE_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

const SEGMENT_OPTIONS = VEHICLE_SEGMENTS.map((value) => ({
  value,
  label: SEGMENT_LABELS[value],
}));

const PAGE_SIZE = 10;

export default function VeiculosContainer() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<VeiculosQuery["status"]>("all");
  const [manufacturerId, setManufacturerId] = useState<number | undefined>();
  const [fuel, setFuel] = useState<VeiculosQuery["fuel"]>();
  const [category, setCategory] = useState<VeiculosQuery["category"]>();
  const [segment, setSegment] = useState<VeiculosQuery["segment"]>();
  const [sortBy, setSortBy] = useState<VeiculosQuery["sortBy"]>("model");
  const [sortDir, setSortDir] = useState<VeiculosQuery["sortDir"]>("asc");
  const [page, setPage] = useState(1);

  const [formModal, setFormModal] = useState<{
    open: boolean;
    veiculo: Veiculo | null;
  }>({ open: false, veiculo: null });
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Veiculo | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: manufacturers } = useManufacturers();

  const query: VeiculosQuery = {
    q: debouncedSearch,
    status,
    manufacturerId,
    fuel,
    category,
    segment,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useVeiculos(query);
  const excluir = useExcluirVeiculo();

  function handleSort(column: VeiculosQuery["sortBy"]) {
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
          <div className="w-56">
            <Input
              label="Buscar"
              placeholder="Marca, modelo, versão..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-40">
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              hidePlaceholder
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as VeiculosQuery["status"]);
                setPage(1);
              }}
            />
          </div>

          <div className="w-44">
            <Select
              label="Marca"
              options={
                manufacturers?.map((m) => ({
                  value: String(m.id),
                  label: m.name,
                })) ?? []
              }
              value={manufacturerId ? String(manufacturerId) : ""}
              onChange={(event) => {
                setManufacturerId(
                  event.target.value ? Number(event.target.value) : undefined
                );
                setPage(1);
              }}
            />
          </div>

          <div className="w-40">
            <Select
              label="Combustível"
              options={FUEL_OPTIONS}
              value={fuel ?? ""}
              onChange={(event) => {
                setFuel(
                  (event.target.value || undefined) as VeiculosQuery["fuel"]
                );
                setPage(1);
              }}
            />
          </div>

          <div className="w-40">
            <Select
              label="Categoria"
              options={CATEGORY_OPTIONS}
              value={category ?? ""}
              onChange={(event) => {
                setCategory(
                  (event.target.value || undefined) as VeiculosQuery["category"]
                );
                setPage(1);
              }}
            />
          </div>

          <div className="w-40">
            <Select
              label="Segmento"
              options={SEGMENT_OPTIONS}
              value={segment ?? ""}
              onChange={(event) => {
                setSegment(
                  (event.target.value || undefined) as VeiculosQuery["segment"]
                );
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setImportOpen(true)}
          >
            Importar CSV
          </Button>

          <Button
            type="button"
            onClick={() => setFormModal({ open: true, veiculo: null })}
          >
            + Novo Veículo
          </Button>
        </div>
      </div>

      <VeiculosTable
        veiculos={data?.data ?? []}
        isLoading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onView={(veiculo) => setDetailId(veiculo.id)}
        onEdit={(veiculo) => setFormModal({ open: true, veiculo })}
        onDelete={(veiculo) => setDeleteTarget(veiculo)}
      />

      {data && data.total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      <VeiculoFormModal
        open={formModal.open}
        veiculo={formModal.veiculo}
        onClose={() => setFormModal({ open: false, veiculo: null })}
      />

      <VeiculoDetailModal
        open={detailId !== null}
        id={detailId}
        onClose={() => setDetailId(null)}
      />

      <ImportCsvModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir veículo"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.manufacturerName} ${deleteTarget.model} ${deleteTarget.version}"? Esta ação não pode ser desfeita.`
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
