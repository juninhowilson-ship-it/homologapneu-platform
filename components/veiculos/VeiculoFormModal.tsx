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
  veiculoFormSchema,
  type VeiculoFormValues,
} from "@/lib/validations/veiculo";
import {
  FUEL_TYPES,
  FUEL_LABELS,
  VEHICLE_CATEGORIES,
  CATEGORY_LABELS,
  VEHICLE_SEGMENTS,
  SEGMENT_LABELS,
} from "@/lib/constants/veiculo";
import { useManufacturers } from "@/hooks/useManufacturers";
import {
  useCriarVeiculo,
  useAtualizarVeiculo,
} from "@/hooks/useVeiculoMutations";
import type { Veiculo } from "@/types/veiculo";

type Props = {
  open: boolean;
  onClose: () => void;
  veiculo?: Veiculo | null;
};

const DEFAULT_VALUES: VeiculoFormValues = {
  manufacturerId: 0,
  model: "",
  version: "",
  yearStart: new Date().getFullYear(),
  yearEnd: new Date().getFullYear(),
  engine: "",
  power: "",
  fuel: "FLEX",
  category: "HATCH",
  segment: "",
  country: "",
  imageUrl: "",
  notes: "",
  isActive: true,
};

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

export default function VeiculoFormModal({ open, onClose, veiculo }: Props) {
  const isEditing = Boolean(veiculo);
  const { data: manufacturers, isLoading: carregandoMarcas } =
    useManufacturers();
  const criar = useCriarVeiculo();
  const atualizar = useAtualizarVeiculo();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<VeiculoFormValues>({
    resolver: zodResolver(veiculoFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;

    reset(
      veiculo
        ? {
            manufacturerId: veiculo.manufacturerId,
            model: veiculo.model,
            version: veiculo.version,
            yearStart: veiculo.yearStart,
            yearEnd: veiculo.yearEnd,
            engine: veiculo.engine,
            power: veiculo.power ?? "",
            fuel: veiculo.fuel,
            category: veiculo.category,
            segment: veiculo.segment ?? "",
            country: veiculo.country ?? "",
            imageUrl: veiculo.imageUrl ?? "",
            notes: veiculo.notes ?? "",
            isActive: veiculo.isActive,
          }
        : DEFAULT_VALUES
    );
  }, [open, veiculo, reset]);

  const pending = criar.isPending || atualizar.isPending;

  function onSubmit(values: VeiculoFormValues) {
    if (isEditing && veiculo) {
      atualizar.mutate({ id: veiculo.id, values }, { onSuccess: onClose });
    } else {
      criar.mutate(values, { onSuccess: onClose });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Veículo" : "Novo Veículo"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Marca"
            options={
              manufacturers?.map((m) => ({
                value: String(m.id),
                label: m.name,
              })) ?? []
            }
            disabled={carregandoMarcas}
            error={errors.manufacturerId?.message}
            {...register("manufacturerId", { valueAsNumber: true })}
          />

          <Input
            label="Modelo"
            error={errors.model?.message}
            {...register("model")}
          />

          <Input
            label="Versão"
            error={errors.version?.message}
            {...register("version")}
          />

          <Input
            label="Motorização"
            error={errors.engine?.message}
            {...register("engine")}
          />

          <Input
            label="Ano Inicial"
            type="number"
            error={errors.yearStart?.message}
            {...register("yearStart", { valueAsNumber: true })}
          />

          <Input
            label="Ano Final"
            type="number"
            error={errors.yearEnd?.message}
            {...register("yearEnd", { valueAsNumber: true })}
          />

          <Input
            label="Potência"
            placeholder="Ex: 120cv"
            error={errors.power?.message}
            {...register("power")}
          />

          <Select
            label="Combustível"
            options={FUEL_OPTIONS}
            hidePlaceholder
            error={errors.fuel?.message}
            {...register("fuel")}
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

          <Input
            label="País"
            error={errors.country?.message}
            {...register("country")}
          />
        </div>

        <Textarea
          label="Observações"
          rows={3}
          error={errors.notes?.message}
          {...register("notes")}
        />

        <Controller
          control={control}
          name="imageUrl"
          render={({ field }) => (
            <ImageUploadField
              label="Imagem"
              value={field.value ?? ""}
              onChange={field.onChange}
              uploadEndpoint="/api/veiculos/upload"
              alt="Imagem do veículo"
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
