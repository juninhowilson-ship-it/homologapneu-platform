import "server-only";
import type { ImportConnector } from "./types";

/**
 * Registro de conectores de APIs oficiais para importação automatizada.
 *
 * Nenhum conector está registrado ainda: não há, até o momento, uma fonte
 * pública e oficial única para o catálogo completo de veículos e pneus
 * homologados no Brasil, e este projeto não fabrica integrações contra
 * endpoints que não existem ou não foram confirmados.
 *
 * Quando uma fonte oficial for definida (ex.: API de um fabricante, do
 * Inmetro, da Fenauto, etc.), implemente `ImportConnector` (types.ts) em um
 * novo arquivo neste diretório e adicione a instância à lista abaixo. O
 * pipeline (rotas /api/importer/connectors e /api/importer/connectors/[id]/sync,
 * rastreamento de lote, deduplicação, log e rollback) já está pronto para
 * recebê-lo sem nenhuma outra mudança.
 */
export const CONNECTORS: ImportConnector[] = [];

export function getConnector(id: string): ImportConnector | undefined {
  return CONNECTORS.find((connector) => connector.id === id);
}

export function listConnectors() {
  return CONNECTORS.map((connector) => ({
    id: connector.id,
    label: connector.label,
    entity: connector.entity,
    description: connector.description,
    configured: connector.isConfigured(),
  }));
}
