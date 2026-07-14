import "server-only";
import { importModelosVeiculo } from "@/services/veiculos";
import {
  FIPE_MARCAS_URL,
  fetchFipeJson,
  fetchFipeModelos,
  fetchFipeReferenciaAtual,
  normalizeMarcaNome,
  type FipeMarca,
} from "./fipeClient";
import type { ConnectorFetchResult, ImportConnector } from "./types";

const REQUEST_DELAY_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Conector para os MODELOS de veículo da tabela FIPE, por marca. Popula
 * apenas VehicleModel (nome do modelo associado à montadora) — nunca
 * VehicleVersion, pois a FIPE não informa motor/categoria/carroceria e
 * inventar esses campos obrigatórios violaria a regra de não usar dados
 * fictícios. Ainda assim, cada modelo real identificado aqui já é uma
 * unidade de cobertura válida da "maior base brasileira" e fica pronto
 * para receber uma VehicleVersion completa quando uma fonte técnica
 * (catálogo oficial da montadora) for conectada.
 *
 * Usa o override `importer` (em vez do despacho padrão por `entity`) pois
 * a entidade VEICULOS já está associada ao importador de versões
 * completas (fipe-montadoras usa MONTADORAS; este usa VEICULOS mas com
 * um fluxo de gravação diferente).
 */
export const fipeModelosConnector: ImportConnector = {
  id: "fipe-modelos-veiculo",
  label: "FIPE — Modelos de Veículo",
  kind: "API_PUBLICA",
  entity: "VEICULOS",
  description:
    "Nomes de modelos de veículo por montadora, da tabela FIPE (parallelum.com.br/fipe). Popula apenas o modelo (sem versão/motor/categoria, que a FIPE não fornece) — nunca inventa especificações técnicas.",
  importer: importModelosVeiculo,

  isConfigured(): boolean {
    return true;
  },

  async fetchRows(): Promise<ConnectorFetchResult> {
    const [marcas, sourceVersion] = await Promise.all([
      fetchFipeJson<FipeMarca[]>(FIPE_MARCAS_URL),
      fetchFipeReferenciaAtual(),
    ]);

    const rows: Record<string, string>[] = [];

    for (const marca of marcas) {
      try {
        const modelos = await fetchFipeModelos(marca.codigo);
        for (const modelo of modelos) {
          rows.push({
            marca: normalizeMarcaNome(marca.nome),
            modelo: modelo.nome.trim(),
          });
        }
      } catch {
        // Marca com falha pontual na API — ignora e segue para a
        // proxima, conforme regra de nunca parar por uma unica fonte.
      }
      await sleep(REQUEST_DELAY_MS);
    }

    return {
      headers: ["marca", "modelo"],
      rows,
      sourceVersion,
      collectedAt: new Date(),
      sourceUrl: FIPE_MARCAS_URL,
    };
  },
};
