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
import ImportWizard, { type ImportField } from "@/components/importer/ImportWizard";
import {
  useHomologacoes,
  type HomologacoesQuery,
} from "@/hooks/useHomologacoes";
import { useExcluirHomologacao } from "@/hooks/useHomologacaoMutations";
import { useHomologacaoOpcoes } from "@/hooks/useHomologacaoOpcoes";
import { useImportarHomologacoes } from "@/hooks/useImportarHomologacoes";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { Homologacao } from "@/types/homologacao";

const SIM_NAO_OPTIONS = [
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
];

const IMPORT_FIELDS: ImportField[] = [
  { key: "codigo", label: "Código", required: true },
  { key: "marca", label: "Marca do veículo", required: true },
  { key: "modelo", label: "Modelo do veículo", required: true },
  { key: "versao", label: "Versão do veículo", required: true },
  { key: "anoModelo", label: "Ano Modelo", required: true },
  { key: "anoFabricacao", label: "Ano de Fabricação" },
  { key: "pneuOriginalFabricante", label: "Fabricante do Pneu Original", required: true },
  { key: "pneuOriginalModelo", label: "Modelo do Pneu Original", required: true },
  { key: "pneuOriginalMedida", label: "Medida do Pneu Original", required: true },
  { key: "pneusOpcionais", label: "Pneus Opcionais (fabricante|modelo|medida;...)" },
  { key: "observacoes", label: "Observações" },
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
  const [importOpen, setImportOpen] = useState(false);

  const { data: opcoes } = useHomologacaoOpcoes();
  const importarHomologacoes = useImportarHomologacoes();

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
            onClick={() => setFormModal({ open: true, homologacao: null })}
          >
            + Nova Homologação
          </Button>
        </div>
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

      <ImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importar Homologações"
        fields={IMPORT_FIELDS}
        templateUrl="/api/homologacoes/import/template"
        onImport={importarHomologacoes}
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
