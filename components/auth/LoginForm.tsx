"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { loginSchema, type LoginValues } from "@/lib/validations/auth";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setErroServidor(null);
    setEnviando(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setErroServidor(data?.error ?? "Não foi possível entrar.");
        return;
      }

      const destino = searchParams.get("next") ?? "/";
      router.push(destino);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <h1 className="text-2xl font-bold">HomologaPneu</h1>
      <p className="mt-1 text-muted-foreground">Entre com sua conta</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        {erroServidor && (
          <p className="text-sm text-red-600">{erroServidor}</p>
        )}

        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </Card>
  );
}
