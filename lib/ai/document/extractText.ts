import "server-only";
import { parseImportFile } from "@/lib/importer/parseFile";
import type { ParsedFile } from "@/lib/importer/parseFile";

const UNSUPPORTED_EXTENSIONS = new Set(["doc", "docx"]);

export type ExtractedDocument = {
  text: string;
  rows: Record<string, string>[];
  headers: string[];
};

function extensionOf(filename: string): string {
  return filename.toLowerCase().split(".").pop() ?? "";
}

function toPlainText(parsed: ParsedFile): string {
  return parsed.rows
    .map((row) => parsed.headers.map((header) => row[header] ?? "").join(" "))
    .join("\n");
}

/** Extrai texto de PDF/XLS/XLSX/CSV/ODS/JSON/XML reaproveitando o parser já
 * existente (lib/importer/parseFile.ts, leitura apenas). DOC/DOCX não têm
 * parser neste projeto — falha com uma mensagem clara em vez de fingir
 * suporte, mesmo padrão de PDF escaneado sem OCR (lib/importer/parsers/pdf.ts). */
export async function extractDocumentText(
  buffer: ArrayBuffer,
  fileName: string
): Promise<ExtractedDocument> {
  const ext = extensionOf(fileName);
  if (UNSUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Formato .${ext} ainda não suportado pela IA Engine (sem parser de DOC/DOCX neste ambiente). Envie PDF, XLSX, XLS, CSV, ODS, JSON ou XML.`
    );
  }

  const parsed = await parseImportFile(buffer, fileName);
  return { text: toPlainText(parsed), rows: parsed.rows, headers: parsed.headers };
}
