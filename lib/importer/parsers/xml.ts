import "server-only";
import { XMLParser } from "fast-xml-parser";
import type { ParsedFile } from "./types";

function findRecordArray(node: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(node)) {
    return node as Record<string, unknown>[];
  }

  if (node && typeof node === "object") {
    for (const value of Object.values(node)) {
      const found = findRecordArray(value);
      if (found) return found;
    }
  }

  return null;
}

export function parseXmlFile(buffer: ArrayBuffer): ParsedFile {
  const text = new TextDecoder("utf-8").decode(buffer);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const parsed = parser.parse(text);
  const records = findRecordArray(parsed) ?? [];

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
