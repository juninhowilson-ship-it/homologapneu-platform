"use client";

import { useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import UsuariosTable from "./UsuariosTable";
import UsuarioFormModal from "./UsuarioFormModal";
import { useUsuarios, type UsuariosQuery } from "@/hooks/useUsuarios";
import { useExcluirUsuario } from "@/hooks/useUsuarioMutations";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { Usuario } from "@/types/user";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Administrador" },
  { value: "USUARIO", label: "Usuário" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
];

const PAGE_SIZE = 10;

export default function UsuariosContainer() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [role, setRole] = useState<UsuariosQuery["role"]>();
  const [status, setStatus] = useState<UsuariosQuery["status"]>();
  const [page, setPage] = useState(1);

  const [formModal, setFormModal] = useState<{
    open: boolean;
    usuario: Usuario | null;
  }>({ open: false, usuario: null });
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);

  const { data: currentUser } = useCurrentUser();

  const query: UsuariosQuery = {
    q: debouncedSearch,
    role,
    status,
    sortBy: "name",
    sortDir: "asc",
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, isLoading } = useUsuarios(query);
  const excluir = useExcluirUsuario();

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
              placeholder="Nome ou e-mail..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="w-48">
            <Select
              label="Perfil"
              options={ROLE_OPTIONS}
              value={role ?? ""}
              onChange={(event) => {
                setRole(
                  (event.target.value || undefined) as UsuariosQuery["role"]
                );
                setPage(1);
              }}
            />
          </div>

          <div className="w-40">
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={status ?? ""}
              onChange={(event) => {
                setStatus(
                  (event.target.value || undefined) as UsuariosQuery["status"]
                );
                setPage(1);
              }}
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setFormModal({ open: true, usuario: null })}
        >
          + Novo Usuário
        </Button>
      </div>

      <UsuariosTable
        usuarios={data?.data ?? []}
        isLoading={isLoading}
        currentUserId={currentUser?.id}
        onEdit={(usuario) => setFormModal({ open: true, usuario })}
        onDelete={(usuario) => setDeleteTarget(usuario)}
      />

      {data && data.total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      <UsuarioFormModal
        open={formModal.open}
        usuario={formModal.usuario}
        onClose={() => setFormModal({ open: false, usuario: null })}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir usuário"
        description={
          deleteTarget
            ? `Tem certeza que deseja excluir o usuário "${deleteTarget.name}"? Esta ação não pode ser desfeita.`
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
