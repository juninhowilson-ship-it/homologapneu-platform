import "server-only";
import type { ImportConnector } from "./types";
import { fipeMontadorasConnector } from "./fipeMontadoras";
import { fipeModelosConnector } from "./fipeModelos";
import { wikidataMontadorasConnector } from "./wikidataMontadoras";
import { wikidataFabricantesPneusConnector } from "./wikidataFabricantesPneus";
import { wikipediaMontadorasConnector } from "./wikipediaMontadoras";
import { catalogoMontadoraOficialConnector } from "./catalogoMontadoraOficial";
import { TIRE_BRAND_CONNECTORS } from "./tireCatalogStubs";
import { baseHomologacoesOficialConnector } from "./baseHomologacoesOficial";

/**
 * Registro de conectores de fontes oficiais para importação automatizada.
 *
 * - fipe-montadoras: funcional (API pública da FIPE) — identificação/nomes.
 * - wikidata-montadoras / wikidata-fabricantes-pneus: funcionais (SPARQL
 *   público do Wikidata) — enriquecimento (país, site, logo, grupo) dos
 *   registros já cadastrados, por correspondência exata de nome.
 * - catalogo-montadora-oficial / base-homologacoes-oficial: estrutura
 *   pronta, aguardando a definição de uma fonte oficial específica — ver
 *   o comentário em cada arquivo para o motivo detalhado.
 * - catalogo-pneu-<marca> (19 conectores, um por fabricante de pneu
 *   vendido no Brasil): estrutura pronta por marca, cada um documentando
 *   o achado especifico (robots.txt, ausencia de API publica, etc.) — ver
 *   tireCatalogStubs.ts.
 *
 * Para adicionar um novo conector: implemente `ImportConnector` (types.ts)
 * em um novo arquivo neste diretório e adicione a instância à lista abaixo.
 * O pipeline (rotas /api/importer/connectors e
 * /api/importer/connectors/[id]/sync, rastreamento de lote, deduplicação,
 * log e rollback) já está pronto para recebê-lo sem nenhuma outra mudança.
 */
export const CONNECTORS: ImportConnector[] = [
  fipeMontadorasConnector,
  fipeModelosConnector,
  wikidataMontadorasConnector,
  wikidataFabricantesPneusConnector,
  wikipediaMontadorasConnector,
  catalogoMontadoraOficialConnector,
  ...TIRE_BRAND_CONNECTORS,
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
