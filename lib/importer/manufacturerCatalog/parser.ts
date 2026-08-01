// Sem `server-only`: função pura, precisa rodar também em scripts
// standalone de importação — mesmo motivo de columnMapping.ts.
import type { ParsedFile } from "@/lib/importer/parsers/types";
import type { ColumnMapping, NormalizedField } from "./columnMapping";

/**
 * Registro normalizado — saída do parser genérico, com nomes de campo
 * padronizados em vez dos nomes de coluna originais da planilha. Ainda
 * NÃO é um ManufacturerProduct/ManufacturerApplication/
 * ManufacturerHomologation (essa gravação é responsabilidade de uma fase
 * futura, fora do escopo desta — "somente infraestrutura"); é só texto
 * normalizado, pronto para a camada normalize.ts interpretar.
 */
export type NormalizedCatalogRow = Partial<Record<NormalizedField, string>>;

function normalizarCabecalho(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Parser genérico baseado em colunas — funciona para QUALQUER
 * fabricante, desde que receba o ColumnMapping correto (ver mappings/).
 * Nunca depende do nome real de nenhuma coluna de nenhuma marca
 * específica (a regra explícita desta fase: "o parser NÃO pode depender
 * da Pirelli"); toda a especificidade de UM fabricante fica isolada no
 * seu próprio arquivo de mapeamento em mappings/.
 *
 * Função pura — não lê arquivo, não grava no banco, não faz rede.
 */
export function parseManufacturerCatalogRow(
  row: Record<string, string>,
  mapping: ColumnMapping
): NormalizedCatalogRow {
  const mapeamentoNormalizado = new Map<string, NormalizedField>();
  for (const [coluna, campo] of Object.entries(mapping)) {
    mapeamentoNormalizado.set(normalizarCabecalho(coluna), campo);
  }

  const resultado: NormalizedCatalogRow = {};
  for (const [coluna, valor] of Object.entries(row)) {
    const campo = mapeamentoNormalizado.get(normalizarCabecalho(coluna));
    if (!campo) continue;
    const texto = valor?.trim();
    if (texto) resultado[campo] = texto;
  }
  return resultado;
}

/**
 * Aplica parseManufacturerCatalogRow a todas as linhas já lidas por
 * lib/importer/parseFile.ts (parseImportFile) — reaproveitado sem
 * alteração; este parser genérico só entra DEPOIS que o arquivo
 * (xlsx/xls/csv/ods) já virou `ParsedFile.rows`.
 */
export function parseManufacturerCatalogFile(
  parsedFile: ParsedFile,
  mapping: ColumnMapping
): NormalizedCatalogRow[] {
  return parsedFile.rows.map((row) => parseManufacturerCatalogRow(row, mapping));
}
