import "server-only";
import { parseCsvRecords } from "@/lib/csv";
import type { ParsedFile } from "./types";

export function parseCsvFile(buffer: ArrayBuffer): ParsedFile {
  const text = new TextDecoder("utf-8").decode(buffer);
  const records = parseCsvRecords(text);
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  return { headers, rows: records };
}
