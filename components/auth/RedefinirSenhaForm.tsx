"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  redefinirSenhaSchema,
  type RedefinirSenhaValues,
} from "@/lib/validations/auth";

export default function RedefinirSenhaForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [sucesso, setSucesso] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RedefinirSenhaValues>({
    resolver: zodResolver(redefinirSenhaSchema),
    defaultValues: { token, novaSenha: "", confirmarSenha: "" },
  });

  async function onSubmit(values: RedefinirSenhaValues) {
    setErroServidor(null);
    setEnviando(true);

    try {
      const response = await fetch("/api/auth/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setErroServidor(data?.error ?? "Não foi possível redefinir a senha.");
        return;
      }

      setSucesso(true);
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-bold">Link inválido</h1>
        <p className="mt-1 text-muted-foreground">
          Este link de redefinição está incompleto ou expirou.
        </p>
        <Link
          href="/esqueci-senha"
          className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Solicitar nova recuperação
        </Link>
      </Card>
    );
  }

  if (sucesso) {
    return (
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-bold">Senha redefinida</h1>
        <p className="mt-1 text-muted-foreground">
          Sua nova senha já está valendo.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Ir para o login
        </Link>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <h1 className="text-2xl font-bold">Nova senha</h1>
      <p className="mt-1 text-muted-foreground">
        Escolha a nova senha da sua conta
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <input type="hidden" {...register("token")} />

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

        {erroServidor && <p className="text-sm text-red-600">{erroServidor}</p>}

        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? "Salvando..." : "Redefinir senha"}
        </Button>
      </form>
    </Card>
  );
}
