import "server-only";
import ExcelJS from "exceljs";
import type { ParsedFile } from "./types";

export async function parseExcelFile(buffer: ArrayBuffer): Promise<ParsedFile> {
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
