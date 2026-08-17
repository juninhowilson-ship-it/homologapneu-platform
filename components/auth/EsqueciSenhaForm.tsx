"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  esqueciSenhaSchema,
  type EsqueciSenhaValues,
} from "@/lib/validations/auth";

export default function EsqueciSenhaForm() {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EsqueciSenhaValues>({
    resolver: zodResolver(esqueciSenhaSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: EsqueciSenhaValues) {
    setErroServidor(null);
    setEnviando(true);

    try {
      const response = await fetch("/api/auth/esqueci-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErroServidor(data?.error ?? "Não foi possível enviar a solicitação.");
        return;
      }

      setMensagem(
        data?.message ?? "Solicitação registrada. Verifique seu e-mail."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <h1 className="text-2xl font-bold">Recuperar senha</h1>
      <p className="mt-1 text-muted-foreground">
        Informe o e-mail da sua conta
      </p>

      {mensagem ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm">{mensagem}</p>
          <Link
            href="/login"
            className="inline-block text-sm font-semibold text-primary hover:underline"
          >
            Voltar para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />

          {erroServidor && (
            <p className="text-sm text-red-600">{erroServidor}</p>
          )}

          <Button type="submit" disabled={enviando} className="w-full">
            {enviando ? "Enviando..." : "Recuperar senha"}
          </Button>

          <Link
            href="/login"
            className="block text-center text-sm text-muted-foreground hover:underline"
          >
            Voltar para o login
          </Link>
        </form>
      )}
    </Card>
  );
}
