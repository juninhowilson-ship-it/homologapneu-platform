"use client";

import Link from "next/link";
import { Car, Warehouse } from "lucide-react";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import SalvarVeiculoButton from "@/components/garagem/SalvarVeiculoButton";
import { useGaragem } from "@/hooks/useGaragem";

function formatarFaixaAno(inicio: number, fim: number) {
  return inicio === fim ? String(inicio) : `${inicio}-${fim}`;
}

export default function GaragemPage() {
  const { data: veiculos, isLoading, isError, refetch } = useGaragem();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand/15 text-brand">
          <Warehouse size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">
            Minha Garagem
          </h1>
          <p className="text-sm text-muted-foreground">
            Veículos salvos para acesso rápido
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Não foi possível carregar a garagem"
          description="Verifique sua conexão ou entre novamente na conta."
          action={
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground transition hover:bg-brand-hover"
            >
              Tentar novamente
            </button>
          }
        />
      ) : !veiculos || veiculos.length === 0 ? (
        <EmptyState
          title="Sua garagem está vazia"
          description="Use o coração nos resultados da pesquisa ou o botão 'Salvar Veículo' na página de um veículo para guardá-lo aqui."
          action={
            <Link
              href="/pesquisa"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-brand-foreground transition hover:bg-brand-hover"
            >
              Pesquisar veículos
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {veiculos.map((v) => (
            <div
              key={v.vehicleVersionId}
              className="group overflow-hidden rounded-xl border border-border bg-surface transition hover:border-brand/50"
            >
              <Link href={`/veiculo/${v.vehicleVersionId}`}>
                <div className="flex h-36 items-center justify-center bg-surface-muted">
                  {v.imagemUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.imagemUrl}
                      alt={`${v.fabricante} ${v.modelo}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Car size={40} className="text-muted-foreground" />
                  )}
                </div>
              </Link>

              <div className="flex items-start justify-between gap-2 p-4">
                <Link
                  href={`/veiculo/${v.vehicleVersionId}`}
                  className="min-w-0"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {v.fabricante}
                  </p>
                  <p className="truncate font-bold text-foreground group-hover:text-brand">
                    {v.modelo} {v.versao}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatarFaixaAno(v.anoInicial, v.anoFinal)} · {v.motorizacao}
                  </p>
                </Link>

                <SalvarVeiculoButton
                  vehicleVersionId={v.vehicleVersionId}
                  variante="icone"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
