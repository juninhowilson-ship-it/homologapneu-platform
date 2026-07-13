"use client";

import { useEffect } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import {
  homologacaoFormSchema,
  type HomologacaoFormValues,
} from "@/lib/validations/homologacao";
import {
  VALIDATION_STATUSES,
  VALIDATION_STATUS_LABELS,
} from "@/lib/constants/validacao";
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
  code: "",
  year: new Date().getFullYear(),
  tireOriginalId: 0,
  tireOptionalIds: [],
  notes: "",
  validationStatus: "NECESSITA_VALIDACAO",
  source: "",
};

const VALIDATION_STATUS_OPTIONS = VALIDATION_STATUSES.map((value) => ({
  value,
  label: VALIDATION_STATUS_LABELS[value],
}));

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
            code: homologacao.code,
            year: homologacao.year,
            tireOriginalId: homologacao.originalTire?.tireId ?? 0,
            tireOptionalIds: homologacao.optionalTires.map((t) => t.tireId),
            notes: homologacao.notes ?? "",
            validationStatus: homologacao.validationStatus,
            source: homologacao.source ?? "",
          }
        : DEFAULT_VALUES
    );
  }, [open, homologacao, reset]);

  const pending = criar.isPending || atualizar.isPending;
  const tireOriginalId = useWatch({ control, name: "tireOriginalId" });

  function handleVehicleChange(vehicleId: number) {
    const vehicle = opcoes?.veiculos.find((v) => v.id === vehicleId);
    if (vehicle) {
      setValue("year", vehicle.yearStart);
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

  const pneusOpcionaisDisponiveis =
    opcoes?.pneus.filter((t) => t.id !== tireOriginalId) ?? [];

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
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Controller
            control={control}
            name="tireOriginalId"
            render={({ field }) => (
              <Select
                label="Pneu Original"
                options={
                  opcoes?.pneus.map((t) => ({
                    value: String(t.id),
                    label: t.label,
                  })) ?? []
                }
                disabled={carregandoOpcoes}
                error={errors.tireOriginalId?.message}
                value={field.value ? String(field.value) : ""}
                onChange={(event) => field.onChange(Number(event.target.value))}
              />
            )}
          />

          <Controller
            control={control}
            name="tireOptionalIds"
            render={({ field }) => (
              <Select
                label="Pneus Opcionais"
                multiple
                hidePlaceholder
                options={pneusOpcionaisDisponiveis.map((t) => ({
                  value: String(t.id),
                  label: t.label,
                }))}
                disabled={carregandoOpcoes}
                error={errors.tireOptionalIds?.message}
                value={field.value.map(String)}
                onChange={(event) => {
                  const selected = Array.from(
                    event.target.selectedOptions
                  ).map((option) => Number(option.value));
                  field.onChange(selected);
                }}
                className="h-auto"
                size={4}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Status de Validação"
            options={VALIDATION_STATUS_OPTIONS}
            hidePlaceholder
            error={errors.validationStatus?.message}
            {...register("validationStatus")}
          />

          <Input
            label="Fonte do dado"
            placeholder="Ex: Ficha técnica oficial do fabricante"
            error={errors.source?.message}
            {...register("source")}
          />
        </div>

        {isEditing && homologacao?.validatedAt && (
          <p className="text-sm text-muted-foreground">
            Validado por {homologacao.validatedBy ?? "—"} em{" "}
            {new Date(homologacao.validatedAt).toLocaleString("pt-BR")}
          </p>
        )}

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
