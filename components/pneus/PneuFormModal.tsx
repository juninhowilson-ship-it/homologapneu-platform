"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Switch from "@/components/ui/Switch";
import Button from "@/components/ui/Button";
import ImageUploadField from "@/components/ui/ImageUploadField";
import {
  pneuFormSchema,
  type PneuFormValues,
} from "@/lib/validations/pneu";
import {
  TIRE_CATEGORIES,
  TIRE_CATEGORY_LABELS,
  TIRE_SEGMENTS,
  TIRE_SEGMENT_LABELS,
} from "@/lib/constants/pneu";
import { useTireManufacturers } from "@/hooks/useTireManufacturers";
import { useCriarPneu, useAtualizarPneu } from "@/hooks/usePneuMutations";
import type { Pneu } from "@/types/pneu";

type Props = {
  open: boolean;
  onClose: () => void;
  pneu?: Pneu | null;
};

const DEFAULT_VALUES: PneuFormValues = {
  tireManufacturerId: 0,
  brand: "",
  model: "",
  width: 195,
  profile: 60,
  rim: 15,
  loadIndex: "",
  speedIndex: "",
  runFlat: false,
  xl: false,
  seal: false,
  tubeless: true,
  category: "PASSEIO",
  segment: "",
  ean: "",
  description: "",
  imageUrl: "",
  isActive: true,
};

const CATEGORY_OPTIONS = TIRE_CATEGORIES.map((value) => ({
  value,
  label: TIRE_CATEGORY_LABELS[value],
}));

const SEGMENT_OPTIONS = TIRE_SEGMENTS.map((value) => ({
  value,
  label: TIRE_SEGMENT_LABELS[value],
}));

export default function PneuFormModal({ open, onClose, pneu }: Props) {
  const isEditing = Boolean(pneu);
  const { data: manufacturers, isLoading: carregandoFabricantes } =
    useTireManufacturers();
  const criar = useCriarPneu();
  const atualizar = useAtualizarPneu();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PneuFormValues>({
    resolver: zodResolver(pneuFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;

    reset(
      pneu
        ? {
            tireManufacturerId: pneu.tireManufacturerId,
            brand: pneu.brand,
            model: pneu.model,
            width: pneu.width,
            profile: pneu.profile,
            rim: pneu.rim,
            loadIndex: pneu.loadIndex,
            speedIndex: pneu.speedIndex,
            runFlat: pneu.runFlat,
            xl: pneu.xl,
            seal: pneu.seal,
            tubeless: pneu.tubeless,
            category: pneu.category,
            segment: pneu.segment ?? "",
            ean: pneu.ean ?? "",
            description: pneu.description ?? "",
            imageUrl: pneu.imageUrl ?? "",
            isActive: pneu.isActive,
          }
        : DEFAULT_VALUES
    );
  }, [open, pneu, reset]);

  const pending = criar.isPending || atualizar.isPending;

  function onSubmit(values: PneuFormValues) {
    if (isEditing && pneu) {
      atualizar.mutate({ id: pneu.id, values }, { onSuccess: onClose });
    } else {
      criar.mutate(values, { onSuccess: onClose });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Pneu" : "Novo Pneu"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Fabricante"
            options={
              manufacturers?.map((m) => ({
                value: String(m.id),
                label: m.name,
              })) ?? []
            }
            disabled={carregandoFabricantes}
            error={errors.tireManufacturerId?.message}
            {...register("tireManufacturerId", { valueAsNumber: true })}
          />

          <Input
            label="Marca"
            error={errors.brand?.message}
            {...register("brand")}
          />

          <Input
            label="Modelo"
            error={errors.model?.message}
            {...register("model")}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Largura"
              type="number"
              error={errors.width?.message}
              {...register("width", { valueAsNumber: true })}
            />
            <Input
              label="Perfil"
              type="number"
              error={errors.profile?.message}
              {...register("profile", { valueAsNumber: true })}
            />
            <Input
              label="Aro"
              type="number"
              error={errors.rim?.message}
              {...register("rim", { valueAsNumber: true })}
            />
          </div>

          <Input
            label="Índice de Carga"
            error={errors.loadIndex?.message}
            {...register("loadIndex")}
          />

          <Input
            label="Índice de Velocidade"
            error={errors.speedIndex?.message}
            {...register("speedIndex")}
          />

          <Select
            label="Categoria"
            options={CATEGORY_OPTIONS}
            hidePlaceholder
            error={errors.category?.message}
            {...register("category")}
          />

          <Select
            label="Segmento"
            options={SEGMENT_OPTIONS}
            error={errors.segment?.message}
            {...register("segment")}
          />

          <Input label="EAN" error={errors.ean?.message} {...register("ean")} />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Controller
            control={control}
            name="runFlat"
            render={({ field }) => (
              <Switch
                label="Run Flat"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
              />
            )}
          />

          <Controller
            control={control}
            name="xl"
            render={({ field }) => (
              <Switch
                label="XL"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
              />
            )}
          />

          <Controller
            control={control}
            name="seal"
            render={({ field }) => (
              <Switch
                label="Seal"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
              />
            )}
          />

          <Controller
            control={control}
            name="tubeless"
            render={({ field }) => (
              <Switch
                label="Tubeless"
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
              />
            )}
          />
        </div>

        <Textarea
          label="Descrição"
          rows={3}
          error={errors.description?.message}
          {...register("description")}
        />

        <Controller
          control={control}
          name="imageUrl"
          render={({ field }) => (
            <ImageUploadField
              label="Imagem"
              value={field.value ?? ""}
              onChange={field.onChange}
              uploadEndpoint="/api/pneus/upload"
              alt="Imagem do pneu"
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
