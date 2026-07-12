"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import HomologacoesTable from "./HomologacoesTable";
import HomologacaoFormModal from "./HomologacaoFormModal";
import HomologacaoDetailModal from "./HomologacaoDetailModal";
import {
  useHomologacoes,
  type HomologacoesQuery,
} from "@/hooks/useHomologacoes";
import { useExcluirHomologacao } from "@/hooks/useHomologacaoMutations";
import { useHomologacaoOpcoes } from "@/hooks/useHomologacaoOpcoes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { Homologacao } from "@/types/homologacao";

const SIM_NAO_OPTIONS = [
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];

const PAGE_SIZE = 10;

export default function HomologacoesContainer() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [vehicleId, setVehicleId] = useState<number | undefined>();
  const [tireId, setTireId] = useState<number | undefined>();
  const [runFlat, setRunFlat] = useState<HomologacoesQuery["runFlat"]>();
  const [xl, setXl] = useState<HomologacoesQuery["xl"]>();
  const [sortBy, setSortBy] = useState<HomologacoesQuery["sortBy"]>("createdAt");
  const [sortDir, setSortDir] = useState<HomologacoesQuery["sortDir"]>("desc");
  const [page, setPage] = useState(1);

  const [formModal, setFormModal] = useState<{
    open: boolean;
    homologacao: Homologacao | null;
  }>({ open: false, homologacao: null });
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Homologacao | null>(null);

  const { data: opcoes } = useHomologacaoOpcoes();

  const query: HomologacoesQuery = {
    q: debouncedSearch,
    vehicleId,
    tireId,
    runFlat,
    xl,
    sortBy,
    sortDir,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useHomologacoes(query);
  const excluir = useExcluirHomologacao();

  function handleSort(column: HomologacoesQuery["sortBy"]) {
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
              placeholder="Código, veículo, pneu..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-56">
            <Select
              label="Veículo"
              options={
                opcoes?.veiculos.map((v) => ({
                  value: String(v.id),
                  label: v.label,
                })) ?? []
              }
              value={vehicleId ? String(vehicleId) : ""}
              onChange={(event) => {
                setVehicleId(
                  event.target.value ? Number(event.target.value) : undefined
                );
                setPage(1);
              }}
            />
          </div>

          <div className="w-56">
            <Select
              label="Pneu"
              options={
                opcoes?.pneus.map((t) => ({
                  value: String(t.id),
                  label: t.label,
                })) ?? []
              }
              value={tireId ? String(tireId) : ""}
              onChange={(event) => {
                setTireId(
                  event.target.value ? Number(event.target.value) : undefined
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
                  (event.target.value || undefined) as HomologacoesQuery["runFlat"]
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
                setXl(
                  (event.target.value || undefined) as HomologacoesQuery["xl"]
                );
                setPage(1);
              }}
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setFormModal({ open: true, homologacao: null })}
        >
          + Nova Homologação
        </Button>
      </div>

      <HomologacoesTable
        homologacoes={data?.data ?? []}
        isLoading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onView={(homologacao) => setDetailId(homologacao.id)}
        onEdit={(homologacao) => setFormModal({ open: true, homologacao })}
        onDelete={(homologacao) => setDeleteTarget(homologacao)}
      />

      {data && data.total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      <HomologacaoFormModal
        open={formModal.open}
        homologacao={formModal.homologacao}
        onClose={() => setFormModal({ open: false, homologacao: null })}
      />

      <HomologacaoDetailModal
        open={detailId !== null}
        id={detailId}
        onClose={() => setDetailId(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir homologação"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir a homologação "${deleteTarget.code}" de ${deleteTarget.vehicleLabel}? Esta ação não pode ser desfeita.`
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
