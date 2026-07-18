// XLSX -> CSV / JSON / HTML. A multi-sheet workbook produces one output
// file per worksheet (the core protocol supports several `files` in a
// single ConversionSuccess) — CSV and JSON have no notion of "sheet", so
// splitting is the only faithful representation.
import type { ConversionOutputFile } from "../../core/types";
import { loadWorkbook, sheetToRows } from "./xlsx-shared";
import { stringifyCsv } from "./csv";
import { baseName, sanitizeForFilename, MIME_TYPES } from "./naming";
import { toArrayBuffer } from "./binary";

function outputName(stem: string, sheetName: string, multiSheet: boolean, extension: string): string {
  const suffix = multiSheet ? `-${sanitizeForFilename(sheetName)}` : "";
  return `${stem}${suffix}.${extension}`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Builds a standalone `<table>` fragment for one sheet's rows. Shared with
 * the xlsx -> pdf pipeline, which parses this HTML back into layout blocks. */
export function sheetRowsToHtmlTable(rows: readonly (readonly string[])[]): string {
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table>${body}</table>`;
}

function sheetHtmlDocument(sheetName: string, rows: readonly (readonly string[])[]): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    sheetName,
  )}</title></head><body><h1>${escapeHtml(sheetName)}</h1>${sheetRowsToHtmlTable(rows)}</body></html>`;
}

function rowsToJsonRecords(rows: readonly (readonly string[])[]): Array<Record<string, string>> {
  const [header, ...dataRows] = rows;
  if (header === undefined) return [];
  return dataRows.map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      const columnKey = key.length > 0 ? key : `column_${String(index + 1)}`;
      record[columnKey] = row[index] ?? "";
    });
    return record;
  });
}

function textFile(name: string, mimeType: string, content: string): ConversionOutputFile {
  return { name, mimeType, data: toArrayBuffer(new TextEncoder().encode(content)) };
}

export async function xlsxToCsvFiles(data: ArrayBuffer, fileName: string): Promise<ConversionOutputFile[]> {
  const workbook = await loadWorkbook(data);
  const stem = baseName(fileName);
  const multiSheet = workbook.worksheets.length > 1;
  return workbook.worksheets.map((worksheet) =>
    textFile(
      outputName(stem, worksheet.name, multiSheet, "csv"),
      MIME_TYPES.csv,
      stringifyCsv(sheetToRows(worksheet)),
    ),
  );
}

export async function xlsxToJsonFiles(data: ArrayBuffer, fileName: string): Promise<ConversionOutputFile[]> {
  const workbook = await loadWorkbook(data);
  const stem = baseName(fileName);
  const multiSheet = workbook.worksheets.length > 1;
  return workbook.worksheets.map((worksheet) =>
    textFile(
      outputName(stem, worksheet.name, multiSheet, "json"),
      MIME_TYPES.json,
      JSON.stringify(rowsToJsonRecords(sheetToRows(worksheet)), null, 2),
    ),
  );
}

export async function xlsxToHtmlFiles(data: ArrayBuffer, fileName: string): Promise<ConversionOutputFile[]> {
  const workbook = await loadWorkbook(data);
  const stem = baseName(fileName);
  const multiSheet = workbook.worksheets.length > 1;
  return workbook.worksheets.map((worksheet) =>
    textFile(
      outputName(stem, worksheet.name, multiSheet, "html"),
      MIME_TYPES.html,
      sheetHtmlDocument(worksheet.name, sheetToRows(worksheet)),
    ),
  );
}
