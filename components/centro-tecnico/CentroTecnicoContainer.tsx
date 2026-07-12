"use client";

import { useState } from "react";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { useHomologacaoOpcoes } from "@/hooks/useHomologacaoOpcoes";
import FichaTecnicaVeiculo from "./FichaTecnicaVeiculo";
import FichaTecnicaPneu from "./FichaTecnicaPneu";

type Modo = "veiculo" | "pneu";

export default function CentroTecnicoContainer() {
  const [modo, setModo] = useState<Modo>("veiculo");
  const [veiculoId, setVeiculoId] = useState<number | null>(null);
  const [pneuId, setPneuId] = useState<number | null>(null);

  const { data: opcoes, isLoading: carregandoOpcoes } = useHomologacaoOpcoes();

  function trocarModo(novoModo: Modo) {
    setModo(novoModo);
    setVeiculoId(null);
    setPneuId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 no-print">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={modo === "veiculo" ? "primary" : "secondary"}
            onClick={() => trocarModo("veiculo")}
          >
            Por Veículo
          </Button>
          <Button
            type="button"
            variant={modo === "pneu" ? "primary" : "secondary"}
            onClick={() => trocarModo("pneu")}
          >
            Por Pneu
          </Button>
        </div>

        {((modo === "veiculo" && veiculoId) || (modo === "pneu" && pneuId)) && (
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            Imprimir ficha
          </Button>
        )}
      </div>

      <div className="max-w-md no-print">
        {modo === "veiculo" ? (
          <Select
            label="Veículo"
            placeholder="Selecione um veículo"
            options={
              opcoes?.veiculos.map((v) => ({
                value: String(v.id),
                label: v.label,
              })) ?? []
            }
            disabled={carregandoOpcoes}
            value={veiculoId ? String(veiculoId) : ""}
            onChange={(event) =>
              setVeiculoId(
                event.target.value ? Number(event.target.value) : null
              )
            }
          />
        ) : (
          <Select
            label="Pneu"
            placeholder="Selecione um pneu"
            options={
              opcoes?.pneus.map((t) => ({
                value: String(t.id),
                label: t.label,
              })) ?? []
            }
            disabled={carregandoOpcoes}
            value={pneuId ? String(pneuId) : ""}
            onChange={(event) =>
              setPneuId(event.target.value ? Number(event.target.value) : null)
            }
          />
        )}
      </div>

      {modo === "veiculo" &&
        (veiculoId ? (
          <FichaTecnicaVeiculo id={veiculoId} />
        ) : (
          <EmptyState
            title="Selecione um veículo"
            description="Escolha um veículo acima para ver a ficha técnica com todos os pneus homologados."
          />
        ))}

      {modo === "pneu" &&
        (pneuId ? (
          <FichaTecnicaPneu id={pneuId} />
        ) : (
          <EmptyState
            title="Selecione um pneu"
            description="Escolha um pneu acima para ver a ficha técnica com todos os veículos homologados."
          />
        ))}
    </div>
  );
}
