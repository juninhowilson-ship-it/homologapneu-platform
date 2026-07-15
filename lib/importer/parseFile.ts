import "server-only";
import { parseCsvFile } from "./parsers/csv";
import { parseExcelFile } from "./parsers/excel";
import { parseOdsFile } from "./parsers/ods";
import { parseJsonFile } from "./parsers/json";
import { parseXmlFile } from "./parsers/xml";
import { parsePdfFile } from "./parsers/pdf";
import type { ParsedFile } from "./parsers/types";

export type { ParsedFile };

export const SUPPORTED_IMPORT_EXTENSIONS = [
  "csv",
  "xlsx",
  "xls",
  "ods",
  "json",
  "xml",
  "pdf",
] as const;

function extensionOf(filename: string): string {
  return filename.toLowerCase().split(".").pop() ?? "";
}

export type ImportFileTypeValue =
  | "CSV"
  | "XLSX"
  | "ODS"
  | "JSON"
  | "XML"
  | "PDF"
  | "API";

export function inferFileType(filename: string): ImportFileTypeValue {
  const ext = extensionOf(filename);

  switch (ext) {
    case "xlsx":
    case "xls":
      return "XLSX";
    case "ods":
      return "ODS";
    case "json":
      return "JSON";
    case "xml":
      return "XML";
    case "pdf":
      return "PDF";
    case "csv":
      return "CSV";
    default:
      return "CSV";
  }
}

export async function parseImportFile(
  buffer: ArrayBuffer,
  filename: string
): Promise<ParsedFile> {
  const ext = extensionOf(filename);

  switch (ext) {
    case "xlsx":
    case "xls":
      return parseExcelFile(buffer);
    case "ods":
      return parseOdsFile(buffer);
    case "json":
      return parseJsonFile(buffer);
    case "xml":
      return parseXmlFile(buffer);
    case "pdf":
      return parsePdfFile(buffer);
    case "csv":
    default:
      return parseCsvFile(buffer);
  }
}
