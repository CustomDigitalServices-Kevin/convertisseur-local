// PDF -> structural blocks, own heuristic reconstruction (per the brief):
// pdfjs-dist has no layout-analysis API, only per-item text with a position
// and a transform matrix, so headings and paragraphs are inferred rather
// than read from real structure. Feeds PDF -> MD, PDF -> DOCX and PDF -> TXT,
// which is why fidelity is "preview" for all three (see module.ts).
//
// Algorithm: group same-line text items by y-position, derive each line
// font size from its transform, classify the most frequent size across the
// document as "body" and every distinct larger size (by descending rank) as
// heading levels 1..6, then merge consecutive same-size lines separated by
// a small vertical gap into one paragraph/heading block. Reuses the shared
// HtmlBlock type (src/converters/shared/html-blocks.ts) as the output shape,
// so the same block already flows into renderBlocksToPdf elsewhere in the
// app for MD/TXT -> PDF.
import type { PDFPageProxy } from "pdfjs-dist";
import type { HtmlBlock } from "../shared/html-blocks";
import { pdfjsLib, toPdfjsConversionError } from "./pdf-pdfjs-runtime";

// pdfjs-dist's public d.ts entry (types/src/pdf.d.ts) does not re-export
// TextItem/TextMarkedContent -- only internal deep paths declare them.
// Deriving the item type from the already-exported PDFPageProxy method
// return type avoids depending on that unstable internal path.
type TextContent = Awaited<ReturnType<PDFPageProxy["getTextContent"]>>;
type TextContentItem = TextContent["items"][number];
export interface TextItemLike {
  readonly str: string;
  readonly transform: unknown;
  readonly hasEOL: boolean;
}

const Y_TOLERANCE = 2;
const PARAGRAPH_GAP_FACTOR = 1.6;

export interface Line {
  readonly text: string;
  readonly y: number;
  readonly fontSize: number;
}

function isTextItem(item: TextContentItem): item is TextContentItem & TextItemLike {
  return "str" in item && typeof item.str === "string" && "transform" in item && "hasEOL" in item;
}

function numberAt(values: unknown, index: number): number {
  if (!Array.isArray(values)) return 0;
  const value: unknown = (values as unknown[])[index];
  return typeof value === "number" ? value : 0;
}

function fontSizeOf(item: TextItemLike): number {
  return Math.abs(numberAt(item.transform, 3)) || Math.abs(numberAt(item.transform, 0)) || 1;
}

function yPositionOf(item: TextItemLike): number {
  return numberAt(item.transform, 5);
}

export function linesFromItems(items: readonly TextItemLike[]): Line[] {
  const lines: Line[] = [];
  let currentText = "";
  let currentY: number | null = null;
  let currentSizeSum = 0;
  let currentSizeCount = 0;

  const flush = (): void => {
    const text = currentText.replaceAll(/\s+/g, " ").trim();
    if (text.length > 0 && currentY !== null) {
      lines.push({ text, y: currentY, fontSize: currentSizeCount > 0 ? currentSizeSum / currentSizeCount : 1 });
    }
    currentText = "";
    currentY = null;
    currentSizeSum = 0;
    currentSizeCount = 0;
  };

  for (const item of items) {
    const y = yPositionOf(item);
    const size = fontSizeOf(item);
    if (currentY !== null && Math.abs(y - currentY) > Y_TOLERANCE) flush();
    currentText += (currentText.length > 0 && !currentText.endsWith(" ") ? " " : "") + item.str;
    currentY = y;
    currentSizeSum += size;
    currentSizeCount += 1;
    if (item.hasEOL) flush();
  }
  flush();
  return lines;
}

function roundSize(size: number): number {
  return Math.round(size * 2) / 2;
}

export function bodySizeOf(lines: readonly Line[]): number {
  const counts = new Map<number, number>();
  for (const line of lines) {
    const bucket = roundSize(line.fontSize);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = -1;
  for (const [size, count] of counts) {
    if (count > bestCount) {
      best = size;
      bestCount = count;
    }
  }
  return best;
}

/** Distinct font sizes clearly larger than body text, ranked into heading levels 1..6. */
export function headingLevelsBySize(lines: readonly Line[], bodySize: number): Map<number, 1 | 2 | 3 | 4 | 5 | 6> {
  const distinctLarger = Array.from(new Set(lines.map((line) => roundSize(line.fontSize))))
    .filter((size) => size > bodySize * 1.05)
    .sort((a, b) => b - a);
  const map = new Map<number, 1 | 2 | 3 | 4 | 5 | 6>();
  distinctLarger.forEach((size, index) => {
    const level = Math.min(index + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6;
    map.set(size, level);
  });
  return map;
}

interface BlockAccumulator {
  role: "paragraph" | number;
  text: string;
  lastY: number;
  fontSize: number;
}

export function blocksFromPageLines(
  lines: readonly Line[],
  headingLevels: ReadonlyMap<number, 1 | 2 | 3 | 4 | 5 | 6>,
  out: HtmlBlock[],
): void {
  let current: BlockAccumulator | null = null;

  const flush = (): void => {
    if (current === null) return;
    const text = current.text.trim();
    if (text.length > 0) {
      out.push(
        typeof current.role === "number"
          ? { kind: "heading", level: current.role as 1 | 2 | 3 | 4 | 5 | 6, text }
          : { kind: "paragraph", text },
      );
    }
    current = null;
  };

  for (const line of lines) {
    const level = headingLevels.get(roundSize(line.fontSize));
    const role: "paragraph" | number = level ?? "paragraph";
    const gap = current === null ? 0 : current.lastY - line.y;
    const startsNewBlock =
      current === null ||
      current.role !== role ||
      typeof current.role === "number" ||
      gap > current.fontSize * PARAGRAPH_GAP_FACTOR;

    if (startsNewBlock) {
      flush();
      current = { role, text: line.text, lastY: line.y, fontSize: line.fontSize };
    } else if (current !== null) {
      current.text += ` ${line.text}`;
      current.lastY = line.y;
    }
  }
  flush();
}

/** Composes bodySizeOf + headingLevelsBySize + blocksFromPageLines over every page. */
export function blocksFromPagesLines(pagesLines: readonly (readonly Line[])[]): HtmlBlock[] {
  const allLines = pagesLines.flat();
  const bodySize = bodySizeOf(allLines);
  const headingLevels = headingLevelsBySize(allLines, bodySize);
  const blocks: HtmlBlock[] = [];
  for (const lines of pagesLines) blocksFromPageLines(lines, headingLevels, blocks);
  return blocks;
}

export async function extractPdfBlocks(
  data: ArrayBuffer,
  reportProgress: (percent: number) => void,
): Promise<HtmlBlock[]> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
  let doc: Awaited<typeof loadingTask.promise>;
  try {
    doc = await loadingTask.promise;
  } catch (error) {
    throw toPdfjsConversionError(error);
  }

  try {
    const pagesLines: Line[][] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const items = content.items.filter(isTextItem);
        pagesLines.push(linesFromItems(items));
      } finally {
        page.cleanup();
      }
      reportProgress(Math.round((pageNumber / doc.numPages) * 80));
    }

    const blocks = blocksFromPagesLines(pagesLines);
    reportProgress(90);
    return blocks;
  } catch (error) {
    throw toPdfjsConversionError(error);
  } finally {
    await loadingTask.destroy();
  }
}
