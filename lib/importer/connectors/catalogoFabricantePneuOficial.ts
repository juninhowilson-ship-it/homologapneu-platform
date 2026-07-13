import "server-only";
import type { ConnectorFetchResult, ImportConnector } from "./types";

/**
 * Conector preparado para o catálogo técnico oficial de um fabricante de
 * pneus (modelos, medidas, índices de carga/velocidade, tecnologias).
 *
 * Nenhum fabricante específico autorizou/publicou um endpoint público
 * confirmado até o momento, então este conector permanece desativado
 * (isConfigured() = false). Quando um catálogo oficial for identificado:
 *
 * 1. Defina TIRE_CATALOG_API_URL (e TIRE_CATALOG_API_KEY, se a fonte
 *    exigir autenticação) no ambiente.
 * 2. Implemente fetchRows() consultando o endpoint real e mapeando cada
 *    linha para os campos aceitos por importPneus (fabricante, marca,
 *    modelo, familia, largura, perfil, aro, indiceCarga, indiceVelocidade,
 *    runFlat, xl, seal, tubeless, categoria, segmento, ean, descricao,
 *    status, tecnologias).
 * 3. Ajuste `entity`/`id`/`label` se o catalogo cobrir apenas um
 *    fabricante especifico, ou duplique este arquivo por fabricante.
 */
export const catalogoFabricantePneuOficialConnector: ImportConnector = {
  id: "catalogo-fabricante-pneu-oficial",
  label: "Catálogo Oficial de Fabricante de Pneus (a configurar)",
  kind: "CATALOGO_FABRICANTE_PNEU",
  entity: "PNEUS",
  description:
    "Conector preparado para o catálogo técnico oficial de um fabricante de pneus (modelos/medidas/índices/tecnologias). Ainda não configurado — nenhuma fonte oficial confirmada.",

  isConfigured(): boolean {
    return Boolean(process.env.TIRE_CATALOG_API_URL);
  },

  async fetchRows(): Promise<ConnectorFetchResult> {
    throw new Error(
      "Conector de catálogo de fabricante de pneus ainda não configurado: defina TIRE_CATALOG_API_URL."
    );
  },
};
