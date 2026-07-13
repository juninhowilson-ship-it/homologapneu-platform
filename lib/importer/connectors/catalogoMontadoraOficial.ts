import "server-only";
import type { ConnectorFetchResult, ImportConnector } from "./types";

/**
 * Conector preparado para o catálogo técnico oficial de uma montadora
 * (modelos, versões, motorização — dados que a FIPE não fornece).
 *
 * Nenhuma montadora específica autorizou/publicou um endpoint público
 * confirmado até o momento, então este conector permanece desativado
 * (isConfigured() = false). Quando um catálogo oficial for identificado:
 *
 * 1. Defina MANUFACTURER_CATALOG_API_URL (e MANUFACTURER_CATALOG_API_KEY,
 *    se a fonte exigir autenticação) no ambiente.
 * 2. Implemente fetchRows() consultando o endpoint real e mapeando cada
 *    linha para os campos aceitos por importVeiculos:
 *      obrigatorios — marca, modelo, versao, anoInicial, anoFinal,
 *        motorizacao, combustivel, categoria;
 *      opcionais — potencia, torque, codigoInterno, anoFabricacaoInicial,
 *        anoFabricacaoFinal, categoriaRegulatoria, segmento, plataforma,
 *        tracao (Dianteira/Traseira/Integral), portas, pais, observacoes,
 *        status.
 *    Campos opcionais ausentes preservam o valor ja cadastrado em
 *    reimportacoes (nunca sao apagados por uma linha incompleta).
 * 3. Ajuste `entity`/`id`/`label` se o catalogo cobrir apenas uma marca
 *    especifica, ou duplique este arquivo por montadora.
 */
export const catalogoMontadoraOficialConnector: ImportConnector = {
  id: "catalogo-montadora-oficial",
  label: "Catálogo Oficial de Montadora (a configurar)",
  kind: "CATALOGO_MONTADORA",
  entity: "VEICULOS",
  description:
    "Conector preparado para o catálogo técnico oficial de uma montadora (modelos/versões/motorização). Ainda não configurado — nenhuma fonte oficial confirmada.",

  isConfigured(): boolean {
    return Boolean(process.env.MANUFACTURER_CATALOG_API_URL);
  },

  async fetchRows(): Promise<ConnectorFetchResult> {
    throw new Error(
      "Conector de catálogo de montadora ainda não configurado: defina MANUFACTURER_CATALOG_API_URL."
    );
  },
};
