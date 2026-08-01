// Sem `server-only`: só dado + uma função pura de lookup, precisa rodar
// também em scripts standalone de importação — mesmo motivo de
// ../columnMapping.ts.
import type { ManufacturerColumnConfig } from "../columnMapping";

/**
 * Registro de mapeamentos de coluna por fabricante — um objeto de DADO
 * por marca (nunca lógica condicional por fabricante; ver parser.ts, que
 * é 100% genérico). Para adicionar uma marca nova: acrescente uma
 * entrada a MANUFACTURER_COLUMN_MAPPINGS — nenhuma outra mudança é
 * necessária.
 *
 * As 15 marcas pedidas na Auditoria Técnica 1 estão todas registradas
 * abaixo com `mapping: {}` e `confirmed: false` — NENHUM nome de coluna
 * real foi adivinhado (isso seria inventar estrutura sem ver o arquivo
 * real de cada marca, violando a regra desta fase). Ver
 * EXAMPLE_COLUMN_MAPPING (exampleMapping.ts) para um modelo completo e
 * funcional — baseado literalmente nos 14 conceitos pedidos nesta fase,
 * não em uma planilha real de nenhuma marca — que serve de referência de
 * como preencher `mapping` quando uma planilha real chegar.
 */
export const MANUFACTURER_COLUMN_MAPPINGS: ManufacturerColumnConfig[] = [
  {
    tireManufacturerName: "Pirelli",
    confirmed: true,
    notes:
      "Baseado no arquivo real \"Pirelli Tabela de Aplicação e Homologação Abril - 2026.xlsx\" " +
      "(aba única, cabeçalho na linha 10 — as linhas 1-9 são um bloco de título/observações, " +
      "tratado pelo import como cabeçalho de fato pela leitura de cabeçalho customizada, não " +
      "pelo parser genérico de linha 1). Convenções específicas deste arquivo, tratadas em " +
      "services/manufacturerCatalog.ts (não no parser genérico, que continua 100% agnóstico de " +
      "fabricante): (1) \"-\" é o marcador de \"sem valor\" desta planilha em qualquer coluna; " +
      "(2) IP terminado em \"*\" indica Phase Out (nota da própria planilha, linha 7) — o \"*\" é " +
      "removido do código armazenado e phaseOut é derivado à parte, não mapeado por coluna; " +
      "(3) \"IP DE APLICAÇÃO\" é o código do produto substituto/atual (aponta para outro IP do " +
      "mesmo catálogo, inclusive o próprio quando o produto não foi descontinuado) — resolvido " +
      "para produtoSubstitutoId numa segunda passada após todos os produtos existirem. " +
      "\"DESCRIÇÃO APLICAÇÃO\" e \"PZERO NOVO\" não têm campo normalizado dedicado nesta fase e " +
      "não foram mapeados (a descrição do substituto já é lida via o próprio produto apontado).",
    mapping: {
      MARCA: "vehicleBrand",
      MODELO: "vehicleModel",
      BASE: "medida",
      DESCRIÇÃO: "descricao",
      IP: "codigoInterno",
      HOMOLOGAÇÃO: "homologado",
      "EIXO DE MONTAGEM": "eixo",
      RR: "rr",
      WET: "wet",
      NOISE: "noise",
      "IP DE APLICAÇÃO": "produtoSubstituto",
    },
  },
  { tireManufacturerName: "Michelin", mapping: {}, confirmed: false },
  { tireManufacturerName: "Continental", mapping: {}, confirmed: false },
  { tireManufacturerName: "Bridgestone", mapping: {}, confirmed: false },
  { tireManufacturerName: "Goodyear", mapping: {}, confirmed: false },
  { tireManufacturerName: "Yokohama", mapping: {}, confirmed: false },
  { tireManufacturerName: "Hankook", mapping: {}, confirmed: false },
  { tireManufacturerName: "Kumho", mapping: {}, confirmed: false },
  { tireManufacturerName: "Giti", mapping: {}, confirmed: false },
  { tireManufacturerName: "Nexen", mapping: {}, confirmed: false },
  { tireManufacturerName: "Toyo", mapping: {}, confirmed: false },
  { tireManufacturerName: "Falken", mapping: {}, confirmed: false },
  { tireManufacturerName: "BFGoodrich", mapping: {}, confirmed: false },
  { tireManufacturerName: "Firestone", mapping: {}, confirmed: false },
  { tireManufacturerName: "General Tire", mapping: {}, confirmed: false },
];

export function getColumnMapping(tireManufacturerName: string): ManufacturerColumnConfig | undefined {
  return MANUFACTURER_COLUMN_MAPPINGS.find(
    (m) => m.tireManufacturerName.toLowerCase() === tireManufacturerName.toLowerCase()
  );
}
