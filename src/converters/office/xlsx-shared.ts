// Shared ExcelJS load/write helpers and cell-to-text extraction used by
// every XLSX-facing converter in this module.
import ExcelJS from "exceljs";
import { ConversionError } from "../../core/types";
import { toArrayBuffer } from "../shared/binary";
import { assertNotPasswordProtected } from "./ooxml";

export async function loadWorkbook(data: ArrayBuffer): Promise<ExcelJS.Workbook> {
  assertNotPasswordProtected(data, "XLSX");
  const workbook = new ExcelJS.Workbook();
  try {
    // ExcelJS's .d.ts types this parameter as Node's `Buffer`, and its own
    // README documents passing a plain ArrayBuffer directly ("Browser"
    // section) — a typings/behavior gap in the upstream package. TypeScript
    // accepts an ArrayBuffer argument here without a cast (verified with
    // tsc directly), so none is added.
    await workbook.xlsx.load(data);
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    throw new ConversionError(
      "corrupted-file",
      `Failed to parse XLSX: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (workbook.worksheets.length === 0) {
    throw new ConversionError("corrupted-file", "Workbook has no worksheets");
  }
  return workbook;
}

export async function writeWorkbookToArrayBuffer(workbook: ExcelJS.Workbook): Promise<ArrayBuffer> {
  const raw = await workbook.xlsx.writeBuffer();
  return toArrayBuffer(new Uint8Array(raw));
}

function isCellErrorValue(value: unknown): value is ExcelJS.CellErrorValue {
  return typeof value === "object" && value !== null && "error" in value;
}

function formulaResultText(result: ExcelJS.CellFormulaValue["result"]): string | null {
  if (result === undefined) return null;
  if (result instanceof Date) return result.toISOString();
  if (isCellErrorValue(result)) return result.error;
  return String(result);
}

/**
 * Renders a cell value as display text. Numbers/dates are not reformatted
 * per the source numFmt (currency, percentages, custom formats are not
 * replicated) — this is a documented fidelity limitation, not a bug: it
 * keeps the exported value numerically exact rather than locale-formatted.
 */
export function cellDisplayText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (isCellErrorValue(value)) return value.error;
  if ("richText" in value) return value.richText.map((run) => run.text).join("");
  if ("hyperlink" in value) return value.text;
  if ("formula" in value || "sharedFormula" in value) {
    const resultText = formulaResultText(value.result);
    if (resultText !== null) return resultText;
    const formulaText = "sharedFormula" in value ? value.sharedFormula : value.formula;
    return `=${formulaText}`;
  }
  return "";
}

/** Reads every row of a worksheet into a rectangular grid of display text,
 * padded to the sheet's declared column count so rows line up positionally
 * (needed for JSON export, harmless for CSV/HTML export). */
export function sheetToRows(worksheet: ExcelJS.Worksheet): string[][] {
  const columnCount = worksheet.columnCount;
  const rows: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    for (let col = 1; col <= columnCount; col += 1) {
      cells.push(cellDisplayText(row.getCell(col).value));
    }
    rows.push(cells);
  });
  return rows;
}
