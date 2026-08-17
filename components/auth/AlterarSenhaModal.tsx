"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  alterarSenhaSchema,
  type AlterarSenhaValues,
} from "@/lib/validations/auth";
import { useAlterarSenha } from "@/hooks/useAlterarSenha";

type Props = {
  open: boolean;
  onClose: () => void;
};

const DEFAULT_VALUES: AlterarSenhaValues = {
  senhaAtual: "",
  novaSenha: "",
  confirmarSenha: "",
};

export default function AlterarSenhaModal({ open, onClose }: Props) {
  const alterarSenha = useAlterarSenha();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AlterarSenhaValues>({
    resolver: zodResolver(alterarSenhaSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) reset(DEFAULT_VALUES);
  }, [open, reset]);

  function onSubmit(values: AlterarSenhaValues) {
    alterarSenha.mutate(values, { onSuccess: onClose });
  }

  return (
    <Dialog open={open} onClose={onClose} title="Trocar senha" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          error={errors.senhaAtual?.message}
          {...register("senhaAtual")}
        />

        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.novaSenha?.message}
          {...register("novaSenha")}
        />

        <Input
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmarSenha?.message}
          {...register("confirmarSenha")}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={alterarSenha.isPending}
          >
            Cancelar
          </Button>

          <Button type="submit" disabled={alterarSenha.isPending}>
            {alterarSenha.isPending ? "Alterando..." : "Alterar senha"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
