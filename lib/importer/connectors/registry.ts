import "server-only";
import type { ImportConnector } from "./types";
import { fipeMontadorasConnector } from "./fipeMontadoras";
import { catalogoMontadoraOficialConnector } from "./catalogoMontadoraOficial";
import { catalogoFabricantePneuOficialConnector } from "./catalogoFabricantePneuOficial";

/**
 * Registro de conectores de fontes oficiais para importação automatizada.
 *
 * - fipe-montadoras: funcional, sem autenticação (API pública da FIPE).
 * - catalogo-montadora-oficial / catalogo-fabricante-pneu-oficial: estrutura
 *   pronta, aguardando a definição de uma fonte oficial específica
 *   (endpoint + credenciais) para cada montadora/fabricante de pneus.
 *
 * Para adicionar um novo conector: implemente `ImportConnector` (types.ts)
 * em um novo arquivo neste diretório e adicione a instância à lista abaixo.
 * O pipeline (rotas /api/importer/connectors e
 * /api/importer/connectors/[id]/sync, rastreamento de lote, deduplicação,
 * log e rollback) já está pronto para recebê-lo sem nenhuma outra mudança.
 */
export const CONNECTORS: ImportConnector[] = [
  fipeMontadorasConnector,
  catalogoMontadoraOficialConnector,
  catalogoFabricantePneuOficialConnector,
];

export function getConnector(id: string): ImportConnector | undefined {
  return CONNECTORS.find((connector) => connector.id === id);
}

export function listConnectors() {
  return CONNECTORS.map((connector) => ({
    id: connector.id,
    label: connector.label,
    kind: connector.kind,
    entity: connector.entity,
    description: connector.description,
    configured: connector.isConfigured(),
  }));
}
