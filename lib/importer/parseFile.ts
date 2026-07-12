import "server-only";
import ExcelJS from "exceljs";
import { parseCsvRecords } from "@/lib/csv";

export type ParsedFile = {
  headers: string[];
  rows: Record<string, string>[];
};

function isExcelFile(filename: string) {
  return /\.(xlsx|xls)$/i.test(filename);
}

async function parseExcel(buffer: ArrayBuffer): Promise<ParsedFile> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { headers: [], rows: [] };
  }

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, string>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const record: Record<string, string> = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1);
      const value = cell.value;
      const text =
        value === null || value === undefined ? "" : String(value).trim();
      if (text) hasValue = true;
      record[header] = text;
    });

    if (hasValue) rows.push(record);
  });

  return { headers: headers.filter(Boolean), rows };
}

function parseCsv(text: string): ParsedFile {
  const records = parseCsvRecords(text);
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  return { headers, rows: records };
}

export async function parseImportFile(
  buffer: ArrayBuffer,
  filename: string
): Promise<ParsedFile> {
  if (isExcelFile(filename)) {
    return parseExcel(buffer);
  }

  const text = new TextDecoder("utf-8").decode(buffer);
  return parseCsv(text);
}
