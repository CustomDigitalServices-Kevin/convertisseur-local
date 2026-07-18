// HtmlBlock[] -> docx paragraphs, used by PDF -> DOCX after pdf-extract.ts
// turns raw PDF text items into heading/paragraph blocks. Kept separate
// from blocks-to-outputs.ts so the plain-text serializers (used by
// PDF -> MD and PDF -> TXT) do not pull the docx object model into their
// chunk when they do not need it.
import { HeadingLevel, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { HtmlBlock } from "../shared/html-blocks";

const HEADING_LEVELS = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
} as const;

function tableRowsToDocx(rows: readonly string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row) =>
        new TableRow({
          children: row.map((cell) => new TableCell({ children: [new Paragraph({ text: cell })] })),
        }),
    ),
  });
}

export function blocksToDocxChildren(blocks: readonly HtmlBlock[]): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case "heading":
        children.push(new Paragraph({ heading: HEADING_LEVELS[block.level], children: [new TextRun(block.text)] }));
        break;
      case "paragraph":
        children.push(new Paragraph({ children: [new TextRun(block.text)] }));
        break;
      case "listItem":
        children.push(new Paragraph({ children: [new TextRun(block.text)], bullet: { level: 0 } }));
        break;
      case "table":
        children.push(tableRowsToDocx(block.rows));
        break;
    }
  }
  return children;
}
