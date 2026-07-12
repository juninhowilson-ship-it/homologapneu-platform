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
import {
  homologacaoFormSchema,
  type HomologacaoFormValues,
} from "@/lib/validations/homologacao";
import { useHomologacaoOpcoes } from "@/hooks/useHomologacaoOpcoes";
import {
  useCriarHomologacao,
  useAtualizarHomologacao,
} from "@/hooks/useHomologacaoMutations";
import type { Homologacao } from "@/types/homologacao";

type Props = {
  open: boolean;
  onClose: () => void;
  homologacao?: Homologacao | null;
};

const DEFAULT_VALUES: HomologacaoFormValues = {
  vehicleId: 0,
  tireId: 0,
  code: "",
  year: new Date().getFullYear(),
  version: "",
  engine: "",
  originalSize: "",
  optionalSize: "",
  runFlat: false,
  xl: false,
  notes: "",
};

export default function HomologacaoFormModal({
  open,
  onClose,
  homologacao,
}: Props) {
  const isEditing = Boolean(homologacao);
  const { data: opcoes, isLoading: carregandoOpcoes } = useHomologacaoOpcoes();
  const criar = useCriarHomologacao();
  const atualizar = useAtualizarHomologacao();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<HomologacaoFormValues>({
    resolver: zodResolver(homologacaoFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;

    reset(
      homologacao
        ? {
            vehicleId: homologacao.vehicleId,
            tireId: homologacao.tireId,
            code: homologacao.code,
            year: homologacao.year,
            version: homologacao.version,
            engine: homologacao.engine,
            originalSize: homologacao.originalSize,
            optionalSize: homologacao.optionalSize ?? "",
            runFlat: homologacao.runFlat,
            xl: homologacao.xl,
            notes: homologacao.notes ?? "",
          }
        : DEFAULT_VALUES
    );
  }, [open, homologacao, reset]);

  const pending = criar.isPending || atualizar.isPending;

  function handleVehicleChange(vehicleId: number) {
    const vehicle = opcoes?.veiculos.find((v) => v.id === vehicleId);
    if (vehicle) {
      setValue("version", vehicle.version);
      setValue("engine", vehicle.engine);
      setValue("year", vehicle.yearStart);
    }
  }

  function handleTireChange(tireId: number) {
    const tire = opcoes?.pneus.find((t) => t.id === tireId);
    if (tire) {
      setValue("originalSize", tire.size);
      setValue("runFlat", tire.runFlat);
      setValue("xl", tire.xl);
    }
  }

  function onSubmit(values: HomologacaoFormValues) {
    if (isEditing && homologacao) {
      atualizar.mutate(
        { id: homologacao.id, values },
        { onSuccess: onClose }
      );
    } else {
      criar.mutate(values, { onSuccess: onClose });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Homologação" : "Nova Homologação"}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Controller
            control={control}
            name="vehicleId"
            render={({ field }) => (
              <Select
                label="Veículo"
                options={
                  opcoes?.veiculos.map((v) => ({
                    value: String(v.id),
                    label: v.label,
                  })) ?? []
                }
                disabled={carregandoOpcoes}
                error={errors.vehicleId?.message}
                value={field.value ? String(field.value) : ""}
                onChange={(event) => {
                  const id = Number(event.target.value);
                  field.onChange(id);
                  handleVehicleChange(id);
                }}
              />
            )}
          />

          <Controller
            control={control}
            name="tireId"
            render={({ field }) => (
              <Select
                label="Pneu"
                options={
                  opcoes?.pneus.map((t) => ({
                    value: String(t.id),
                    label: t.label,
                  })) ?? []
                }
                disabled={carregandoOpcoes}
                error={errors.tireId?.message}
                value={field.value ? String(field.value) : ""}
                onChange={(event) => {
                  const id = Number(event.target.value);
                  field.onChange(id);
                  handleTireChange(id);
                }}
              />
            )}
          />

          <Input
            label="Código de Homologação"
            error={errors.code?.message}
            {...register("code")}
          />

          <Input
            label="Ano"
            type="number"
            error={errors.year?.message}
            {...register("year", { valueAsNumber: true })}
          />

          <Input
            label="Versão"
            error={errors.version?.message}
            {...register("version")}
          />

          <Input
            label="Motor"
            error={errors.engine?.message}
            {...register("engine")}
          />

          <Input
            label="Medida Original"
            error={errors.originalSize?.message}
            {...register("originalSize")}
          />

          <Input
            label="Medida Opcional"
            error={errors.optionalSize?.message}
            {...register("optionalSize")}
          />
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
        </div>

        <Textarea
          label="Observações"
          rows={3}
          error={errors.notes?.message}
          {...register("notes")}
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
