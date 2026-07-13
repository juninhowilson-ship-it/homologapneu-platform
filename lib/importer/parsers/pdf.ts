import "server-only";
import type { ParsedFile } from "./types";

/**
 * Estrutura preparada para importação de PDF (ex.: catálogos técnicos
 * digitalizados). A extração de texto/tabelas de PDF ainda não está
 * implementada — quando disponível, deve popular o mesmo contrato
 * ParsedFile{headers, rows} consumido pelo restante do pipeline.
 */
export function parsePdfFile(): ParsedFile {
  throw new Error(
    "Importação de PDF ainda não implementada nesta versão. Estrutura do pipeline já preparada — envie o arquivo em CSV, Excel, ODS, JSON ou XML por enquanto."
  );
}
