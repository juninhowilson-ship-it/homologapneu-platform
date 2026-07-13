import "server-only";
import type { ParsedFile } from "./types";

function extractRecords(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.rows)) return obj.rows as Record<string, unknown>[];
    if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
  }

  return [];
}

export function parseJsonFile(buffer: ArrayBuffer): ParsedFile {
  const text = new TextDecoder("utf-8").decode(buffer);
  const parsed = JSON.parse(text);
  const records = extractRecords(parsed);

  if (records.length === 0) return { headers: [], rows: [] };

  const headers = Array.from(
    new Set(
      records.flatMap((record) =>
        record && typeof record === "object" ? Object.keys(record) : []
      )
    )
  );

  const rows = records.map((record) => {
    const row: Record<string, string> = {};
    for (const key of headers) {
      const value = record?.[key];
      row[key] = value === null || value === undefined ? "" : String(value);
    }
    return row;
  });

  return { headers, rows };
}
