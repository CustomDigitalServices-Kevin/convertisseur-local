// XLSX -> PDF, routed through the HTML intermediate representation shared
// with xlsx-to-tabular (one <table> per sheet, an <h2> heading per sheet
// name) and the same block-based PDF layout used by docx -> pdf.
// Fidelity is "medium": tabular structure and text are preserved, but
// number formatting, cell styling and column widths are not.
import type { ConversionOutputFile } from "../../core/types";
import { loadWorkbook, sheetToRows } from "./xlsx-shared";
import { sheetRowsToHtmlTable, escapeHtml } from "./xlsx-to-tabular";
import { parseHtmlBlocks } from "../shared/html-blocks";
import { renderBlocksToPdf } from "../shared/pdf-render";
import { baseName, MIME_TYPES } from "./naming";

export async function xlsxToPdfFile(
  data: ArrayBuffer,
  fileName: string,
  reportProgress: (percent: number) => void,
): Promise<ConversionOutputFile> {
  const workbook = await loadWorkbook(data);
  reportProgress(20);

  const sheetCount = workbook.worksheets.length;
  const htmlParts = workbook.worksheets.map((worksheet, index) => {
    const rows = sheetToRows(worksheet);
    reportProgress(20 + Math.round(((index + 1) / sheetCount) * 40));
    return `<h2>${escapeHtml(worksheet.name)}</h2>${sheetRowsToHtmlTable(rows)}`;
  });
  const html = `<!doctype html><html><body>${htmlParts.join("")}</body></html>`;

  const blocks = parseHtmlBlocks(html);
  reportProgress(70);
  const pdfBytes = await renderBlocksToPdf(blocks);
  reportProgress(95);

  return { name: `${baseName(fileName)}.pdf`, mimeType: MIME_TYPES.pdf, data: pdfBytes };
}
