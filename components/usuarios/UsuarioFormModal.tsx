"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Switch from "@/components/ui/Switch";
import Button from "@/components/ui/Button";
import {
  usuarioFormSchema,
  type UsuarioFormValues,
} from "@/lib/validations/auth";
import {
  useCriarUsuario,
  useAtualizarUsuario,
} from "@/hooks/useUsuarioMutations";
import type { Usuario } from "@/types/user";

type Props = {
  open: boolean;
  onClose: () => void;
  usuario?: Usuario | null;
};

const ROLE_OPTIONS = [
  { value: "USUARIO", label: "Usuário" },
  { value: "ADMIN", label: "Administrador" },
];

const DEFAULT_VALUES: UsuarioFormValues = {
  name: "",
  email: "",
  password: "",
  role: "USUARIO",
  isActive: true,
};

export default function UsuarioFormModal({ open, onClose, usuario }: Props) {
  const isEditing = Boolean(usuario);
  const criar = useCriarUsuario();
  const atualizar = useAtualizarUsuario();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;

    reset(
      usuario
        ? {
            name: usuario.name,
            email: usuario.email,
            password: "",
            role: usuario.role,
            isActive: usuario.isActive,
          }
        : DEFAULT_VALUES
    );
  }, [open, usuario, reset]);

  const pending = criar.isPending || atualizar.isPending;

  function onSubmit(values: UsuarioFormValues) {
    if (isEditing && usuario) {
      atualizar.mutate({ id: usuario.id, values }, { onSuccess: onClose });
    } else {
      criar.mutate(values, { onSuccess: onClose });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Usuário" : "Novo Usuário"}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nome"
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          label="E-mail"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label={isEditing ? "Nova senha (deixe em branco para manter)" : "Senha"}
          type="password"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <Select
                label="Perfil"
                options={ROLE_OPTIONS}
                hidePlaceholder
                error={errors.role?.message}
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
              />
            )}
          />

          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <div className="pt-6">
                <Switch
                  label="Ativo"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                />
              </div>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
          >
            Cancelar
          </Button>

          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
