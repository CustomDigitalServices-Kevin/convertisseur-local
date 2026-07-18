// Lays out parsed HTML blocks onto A4 pages with pdf-lib. This is a text
// layout engine, not an HTML/CSS renderer: headings/paragraphs/list items
// are word-wrapped, tables get equal-width columns, inline formatting
// (bold/italic/links) is flattened to plain text. That is the documented
// boundary of "medium"/"preview" fidelity for the two conversions that use
// this renderer (xlsx -> pdf, docx -> pdf).
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PDFFont, PDFPage } from "pdf-lib";
import type { HtmlBlock } from "./html-blocks";
import { toArrayBuffer } from "./binary";

const PAGE_WIDTH = 595.28; // A4 at 72 dpi
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const BODY_SIZE = 10;
const LINE_GAP = 4;
const MAX_CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const MIN_COLUMN_TEXT_WIDTH = 20;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (current.length === 0 || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

interface Cursor {
  page: PDFPage;
  y: number;
}

class PdfLayout {
  private readonly doc: PDFDocument;
  private readonly font: PDFFont;
  private readonly boldFont: PDFFont;
  private cursor: Cursor;

  private constructor(doc: PDFDocument, font: PDFFont, boldFont: PDFFont) {
    this.doc = doc;
    this.font = font;
    this.boldFont = boldFont;
    this.cursor = { page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN };
  }

  static async create(): Promise<PdfLayout> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    return new PdfLayout(doc, font, boldFont);
  }

  private ensureSpace(needed: number): void {
    if (this.cursor.y - needed < MARGIN) {
      const page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.cursor = { page, y: PAGE_HEIGHT - MARGIN };
    }
  }

  private drawLine(text: string, size: number, font: PDFFont, x = MARGIN): void {
    const lineHeight = size + LINE_GAP;
    this.ensureSpace(lineHeight);
    this.cursor.page.drawText(text, { x, y: this.cursor.y - size, size, font, color: rgb(0, 0, 0) });
    this.cursor = { page: this.cursor.page, y: this.cursor.y - lineHeight };
  }

  private addGap(gap: number): void {
    this.cursor = { page: this.cursor.page, y: this.cursor.y - gap };
  }

  addHeading(level: number, text: string): void {
    const size = Math.max(11, 20 - (level - 1) * 2);
    for (const line of wrapText(text, this.boldFont, size, MAX_CONTENT_WIDTH)) {
      this.drawLine(line, size, this.boldFont);
    }
    this.addGap(4);
  }

  addParagraph(text: string): void {
    for (const line of wrapText(text, this.font, BODY_SIZE, MAX_CONTENT_WIDTH)) {
      this.drawLine(line, BODY_SIZE, this.font);
    }
    this.addGap(6);
  }

  addListItem(text: string): void {
    const bulletWidth = 14;
    const lines = wrapText(text, this.font, BODY_SIZE, MAX_CONTENT_WIDTH - bulletWidth);
    lines.forEach((line, index) => {
      const prefix = index === 0 ? "• " : "  ";
      this.drawLine(`${prefix}${line}`, BODY_SIZE, this.font);
    });
  }

  addTable(rows: string[][]): void {
    if (rows.length === 0) return;
    const columnCount = Math.max(...rows.map((row) => row.length));
    if (columnCount === 0) return;
    const columnWidth = MAX_CONTENT_WIDTH / columnCount;
    const cellSize = 9;
    const cellTextWidth = Math.max(MIN_COLUMN_TEXT_WIDTH, columnWidth - 6);

    for (const row of rows) {
      const wrappedCells = Array.from({ length: columnCount }, (_, col) =>
        wrapText(row[col] ?? "", this.font, cellSize, cellTextWidth),
      );
      const rowLines = Math.max(1, ...wrappedCells.map((cell) => cell.length));
      const rowHeight = rowLines * (cellSize + 2) + 4;
      this.ensureSpace(rowHeight);
      const rowTop = this.cursor.y;
      for (let col = 0; col < columnCount; col += 1) {
        const x = MARGIN + col * columnWidth + 3;
        const cellLines = wrappedCells[col] ?? [];
        cellLines.forEach((line, lineIndex) => {
          this.cursor.page.drawText(line, {
            x,
            y: rowTop - cellSize - lineIndex * (cellSize + 2),
            size: cellSize,
            font: this.font,
            color: rgb(0, 0, 0),
          });
        });
      }
      this.cursor = { page: this.cursor.page, y: rowTop - rowHeight };
    }
    this.addGap(6);
  }

  addPlaceholder(text: string): void {
    this.drawLine(text, BODY_SIZE, this.font);
  }

  async save(): Promise<ArrayBuffer> {
    const bytes = await this.doc.save();
    return toArrayBuffer(bytes);
  }
}

export async function renderBlocksToPdf(blocks: readonly HtmlBlock[]): Promise<ArrayBuffer> {
  const layout = await PdfLayout.create();
  if (blocks.length === 0) {
    layout.addPlaceholder("(empty document)");
  }
  for (const block of blocks) {
    switch (block.kind) {
      case "heading":
        layout.addHeading(block.level, block.text);
        break;
      case "paragraph":
        layout.addParagraph(block.text);
        break;
      case "listItem":
        layout.addListItem(block.text);
        break;
      case "table":
        layout.addTable(block.rows);
        break;
    }
  }
  return layout.save();
}
