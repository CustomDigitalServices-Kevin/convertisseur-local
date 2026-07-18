// CSV -> XLSX. Delimiter (comma vs semicolon) is auto-detected by parseCsv.
import ExcelJS from "exceljs";
import type { ConversionOutputFile } from "../../core/types";
import { parseCsv } from "./csv";
import { writeWorkbookToArrayBuffer } from "./xlsx-shared";
import { baseName, MIME_TYPES } from "./naming";

export async function csvToXlsxFiles(data: ArrayBuffer, fileName: string): Promise<ConversionOutputFile[]> {
  const text = new TextDecoder("utf-8").decode(data);
  const { rows } = parseCsv(text);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");
  for (const row of rows) {
    worksheet.addRow(row);
  }

  const buffer = await writeWorkbookToArrayBuffer(workbook);
  return [{ name: `${baseName(fileName)}.xlsx`, mimeType: MIME_TYPES.xlsx, data: buffer }];
}
