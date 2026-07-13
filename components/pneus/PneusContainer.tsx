"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ImportWizard, { type ImportField } from "@/components/importer/ImportWizard";
import PneusTable from "./PneusTable";
import PneuFormModal from "./PneuFormModal";
import PneuDetailModal from "./PneuDetailModal";
import { usePneus, type PneusQuery } from "@/hooks/usePneus";
import { useExcluirPneu } from "@/hooks/usePneuMutations";
import { useImportarPneus } from "@/hooks/useImportarPneus";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTireManufacturers } from "@/hooks/useTireManufacturers";
import {
  TIRE_CATEGORIES,
  TIRE_CATEGORY_LABELS,
  TIRE_SEGMENTS,
  TIRE_SEGMENT_LABELS,
} from "@/lib/constants/pneu";
import type { Pneu } from "@/types/pneu";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
];

const SIM_NAO_OPTIONS = [
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];

const CATEGORY_OPTIONS = TIRE_CATEGORIES.map((value) => ({
  value,
  label: TIRE_CATEGORY_LABELS[value],
}));

const SEGMENT_OPTIONS = TIRE_SEGMENTS.map((value) => ({
  value,
  label: TIRE_SEGMENT_LABELS[value],
}));

const IMPORT_FIELDS: ImportField[] = [
  { key: "fabricante", label: "Fabricante", required: true },
  { key: "marca", label: "Marca" },
  { key: "modelo", label: "Modelo", required: true },
  { key: "familia", label: "Família" },
  { key: "largura", label: "Largura", required: true },
  { key: "perfil", label: "Perfil", required: true },
  { key: "aro", label: "Aro", required: true },
  { key: "indiceCarga", label: "Índice de Carga", required: true },
  { key: "indiceVelocidade", label: "Índice de Velocidade", required: true },
  { key: "runFlat", label: "Run Flat" },
  { key: "xl", label: "XL" },
  { key: "seal", label: "Seal" },
  { key: "tubeless", label: "Tubeless" },
  { key: "categoria", label: "Categoria", required: true },
  { key: "segmento", label: "Segmento" },
  { key: "ean", label: "EAN" },
  { key: "descricao", label: "Descrição" },
  { key: "status", label: "Status" },
];

const PAGE_SIZE = 10;

export default function PneusContainer() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [status, setStatus] = useState<PneusQuery["status"]>("all");
  const [tireManufacturerId, setTireManufacturerId] = useState<
    number | undefined
  >();
  const [category, setCategory] = useState<PneusQuery["category"]>();
  const [segment, setSegment] = useState<PneusQuery["segment"]>();
  const [runFlat, setRunFlat] = useState<PneusQuery["runFlat"]>();
  const [xl, setXl] = useState<PneusQuery["xl"]>();
  const [sortBy, setSortBy] = useState<PneusQuery["sortBy"]>("model");
  const [sortDir, setSortDir] = useState<PneusQuery["sortDir"]>("asc");
  const [page, setPage] = useState(1);

  const [formModal, setFormModal] = useState<{
    open: boolean;
    pneu: Pneu | null;
  }>({ open: false, pneu: null });
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pneu | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: manufacturers } = useTireManufacturers();
  const importarPneus = useImportarPneus();

  const query: PneusQuery = {
    q: debouncedSearch,
    status,
    tireManufacturerId,
    category,
    segment,
    runFlat,
    xl,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = usePneus(query);
  const excluir = useExcluirPneu();

  function handleSort(column: PneusQuery["sortBy"]) {
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
              placeholder="Fabricante, marca, modelo, EAN..."
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
                setStatus(event.target.value as PneusQuery["status"]);
                setPage(1);
              }}
            />
          </div>

          <div className="w-44">
            <Select
              label="Fabricante"
              options={
                manufacturers?.map((m) => ({
                  value: String(m.id),
                  label: m.name,
                })) ?? []
              }
              value={tireManufacturerId ? String(tireManufacturerId) : ""}
              onChange={(event) => {
                setTireManufacturerId(
                  event.target.value ? Number(event.target.value) : undefined
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
                  (event.target.value || undefined) as PneusQuery["category"]
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
                  (event.target.value || undefined) as PneusQuery["segment"]
                );
                setPage(1);
              }}
            />
          </div>

          <div className="w-32">
            <Select
              label="Run Flat"
              options={SIM_NAO_OPTIONS}
              value={runFlat ?? ""}
              onChange={(event) => {
                setRunFlat(
                  (event.target.value || undefined) as PneusQuery["runFlat"]
                );
                setPage(1);
              }}
            />
          </div>

          <div className="w-32">
            <Select
              label="XL"
              options={SIM_NAO_OPTIONS}
              value={xl ?? ""}
              onChange={(event) => {
                setXl((event.target.value || undefined) as PneusQuery["xl"]);
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
            Importar
          </Button>

          <Button
            type="button"
            onClick={() => setFormModal({ open: true, pneu: null })}
          >
            + Novo Pneu
          </Button>
        </div>
      </div>

      <PneusTable
        pneus={data?.data ?? []}
        isLoading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onView={(pneu) => setDetailId(pneu.id)}
        onEdit={(pneu) => setFormModal({ open: true, pneu })}
        onDelete={(pneu) => setDeleteTarget(pneu)}
      />

      {data && data.total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      <PneuFormModal
        open={formModal.open}
        pneu={formModal.pneu}
        onClose={() => setFormModal({ open: false, pneu: null })}
      />

      <PneuDetailModal
        open={detailId !== null}
        id={detailId}
        onClose={() => setDetailId(null)}
      />

      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importar Pneus"
        fields={IMPORT_FIELDS}
        templateUrl="/api/pneus/import/template"
        onImport={importarPneus}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir pneu"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.tireManufacturerName} ${deleteTarget.model} ${deleteTarget.size}"? Esta ação não pode ser desfeita.`
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
