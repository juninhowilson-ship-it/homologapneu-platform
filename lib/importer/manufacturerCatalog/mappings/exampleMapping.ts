// Sem `server-only`: só dado, mesmo motivo de ../columnMapping.ts.
import type { ManufacturerColumnConfig } from "../columnMapping";

/**
 * Mapeamento de REFERÊNCIA — não corresponde a nenhuma planilha real de
 * nenhum fabricante (nunca registrado em MANUFACTURER_COLUMN_MAPPINGS).
 * Usa nomes de coluna em português exatamente como os 14 conceitos foram
 * pedidos nesta fase, só para provar que ColumnMapping + o parser
 * genérico produzem um NormalizedCatalogRow completo de ponta a ponta.
 *
 * Ao receber a primeira planilha real de uma marca: copie esta
 * estrutura para a entrada correspondente em registry.ts, troque as
 * chaves pelos nomes de coluna REAIS do arquivo, e marque
 * `confirmed: true`.
 */
export const EXAMPLE_COLUMN_MAPPING: ManufacturerColumnConfig = {
  tireManufacturerName: "Exemplo",
  confirmed: false,
  notes:
    "Referência ilustrativa (Auditoria Técnica 1) — não é uma marca real, nunca deve ser registrada em MANUFACTURER_COLUMN_MAPPINGS.",
  mapping: {
    "Marca do Veículo": "vehicleBrand",
    "Modelo": "vehicleModel",
    "Medida": "medida",
    "Descrição": "descricao",
    "Código Interno": "codigoInterno",
    "Homologado": "homologado",
    "Aplicação": "aplicacao",
    "Eixo": "eixo",
    "RR": "rr",
    "Wet": "wet",
    "Noise": "noise",
    "Produto Substituto": "produtoSubstituto",
    "Phase Out": "phaseOut",
    "Produto Equivalente": "produtoEquivalente",
  },
};
