import "server-only";
import type { ImportConnector } from "./types";
import { fipeMontadorasConnector } from "./fipeMontadoras";
import { wikidataMontadorasConnector } from "./wikidataMontadoras";
import { wikidataFabricantesPneusConnector } from "./wikidataFabricantesPneus";
import { catalogoMontadoraOficialConnector } from "./catalogoMontadoraOficial";
import { catalogoFabricantePneuOficialConnector } from "./catalogoFabricantePneuOficial";
import { baseHomologacoesOficialConnector } from "./baseHomologacoesOficial";

/**
 * Registro de conectores de fontes oficiais para importação automatizada.
 *
 * - fipe-montadoras: funcional (API pública da FIPE) — identificação/nomes.
 * - wikidata-montadoras / wikidata-fabricantes-pneus: funcionais (SPARQL
 *   público do Wikidata) — enriquecimento (país, site, logo, grupo) dos
 *   registros já cadastrados, por correspondência exata de nome.
 * - catalogo-montadora-oficial / catalogo-fabricante-pneu-oficial /
 *   base-homologacoes-oficial: estrutura pronta, aguardando a definição de
 *   uma fonte oficial específica (endpoint + credenciais) — ver o
 *   comentário em cada arquivo para o motivo detalhado.
 *
 * Para adicionar um novo conector: implemente `ImportConnector` (types.ts)
 * em um novo arquivo neste diretório e adicione a instância à lista abaixo.
 * O pipeline (rotas /api/importer/connectors e
 * /api/importer/connectors/[id]/sync, rastreamento de lote, deduplicação,
 * log e rollback) já está pronto para recebê-lo sem nenhuma outra mudança.
 */
export const CONNECTORS: ImportConnector[] = [
  fipeMontadorasConnector,
  wikidataMontadorasConnector,
  wikidataFabricantesPneusConnector,
  catalogoMontadoraOficialConnector,
  catalogoFabricantePneuOficialConnector,
  baseHomologacoesOficialConnector,
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
