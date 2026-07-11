"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Switch from "@/components/ui/Switch";
import Button from "@/components/ui/Button";
import LogoUploadField from "./LogoUploadField";
import {
  fabricanteFormSchema,
  type FabricanteFormValues,
} from "@/lib/validations/fabricante";
import {
  useCriarFabricante,
  useAtualizarFabricante,
} from "@/hooks/useFabricanteMutations";
import type { Fabricante } from "@/types/fabricante";

type Props = {
  open: boolean;
  onClose: () => void;
  fabricante?: Fabricante | null;
};

const DEFAULT_VALUES: FabricanteFormValues = {
  name: "",
  country: "",
  website: "",
  notes: "",
  logoUrl: "",
  isActive: true,
};

export default function FabricanteFormModal({
  open,
  onClose,
  fabricante,
}: Props) {
  const isEditing = Boolean(fabricante);
  const criar = useCriarFabricante();
  const atualizar = useAtualizarFabricante();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FabricanteFormValues>({
    resolver: zodResolver(fabricanteFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;

    reset(
      fabricante
        ? {
            name: fabricante.name,
            country: fabricante.country,
            website: fabricante.website ?? "",
            notes: fabricante.notes ?? "",
            logoUrl: fabricante.logoUrl ?? "",
            isActive: fabricante.isActive,
          }
        : DEFAULT_VALUES
    );
  }, [open, fabricante, reset]);

  const pending = criar.isPending || atualizar.isPending;

  function onSubmit(values: FabricanteFormValues) {
    if (isEditing && fabricante) {
      atualizar.mutate({ id: fabricante.id, values }, { onSuccess: onClose });
    } else {
      criar.mutate(values, { onSuccess: onClose });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Fabricante" : "Novo Fabricante"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Nome" error={errors.name?.message} {...register("name")} />

        <Input
          label="País"
          error={errors.country?.message}
          {...register("country")}
        />

        <Input
          label="Site"
          placeholder="https://..."
          error={errors.website?.message}
          {...register("website")}
        />

        <Textarea
          label="Observações"
          rows={3}
          error={errors.notes?.message}
          {...register("notes")}
        />

        <Controller
          control={control}
          name="logoUrl"
          render={({ field }) => (
            <LogoUploadField
              value={field.value ?? ""}
              onChange={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <Switch
              label="Ativo"
              checked={field.value}
              onChange={(event) => field.onChange(event.target.checked)}
            />
          )}
        />

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
