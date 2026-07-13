import "server-only";
import * as XLSX from "xlsx";
import type { ParsedFile } from "./types";

export function parseOdsFile(buffer: ArrayBuffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[sheetName];
  const table = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as string[][];

  if (table.length === 0) return { headers: [], rows: [] };

  const [headerRow, ...dataRows] = table;
  const headers = headerRow.map((h) => String(h ?? "").trim()).filter(Boolean);

  const rows = dataRows
    .map((row) => {
      const record: Record<string, string> = {};
      headerRow.forEach((h, index) => {
        const key = String(h ?? "").trim();
        if (!key) return;
        record[key] = String(row[index] ?? "").trim();
      });
      return record;
    })
    .filter((record) => Object.values(record).some((value) => value !== ""));

  return { headers, rows };
}
