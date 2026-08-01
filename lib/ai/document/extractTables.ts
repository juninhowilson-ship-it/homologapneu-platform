import "server-only";

export type ExtractedTable = {
  headers: string[];
  rows: Record<string, string>[];
};

/** Empacota headers/rows já retornados por parseImportFile (CSV/XLSX/ODS/
 * JSON/XML) ou pelas linhas de texto de um PDF (uma coluna "texto" por
 * linha, ver lib/importer/parsers/pdf.ts) num formato único para o
 * resultado da pipeline — não faz nenhuma transformação além de limitar o
 * tamanho guardado. */
export function extractTables(headers: string[], rows: Record<string, string>[]): ExtractedTable {
  const MAX_ROWS = 500;
  return { headers, rows: rows.slice(0, MAX_ROWS) };
}
