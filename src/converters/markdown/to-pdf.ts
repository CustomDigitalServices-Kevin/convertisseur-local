// MD -> PDF and TXT -> PDF, both through the shared text-layout PDF engine
// (src/converters/shared/{html-blocks,pdf-render}.ts) already used by
// xlsx -> pdf and docx -> pdf in the office module. Fidelity "medium": the
// same documented boundary as those two conversions -- headings, paragraphs,
// list items and tables survive as text, page geometry/fonts/inline styling
// do not.
import type { ConversionOutputFile } from "../../core/types";
import type { HtmlBlock } from "../shared/html-blocks";
import { parseHtmlBlocks } from "../shared/html-blocks";
import { renderBlocksToPdf } from "../shared/pdf-render";
import { markdownToHtmlBody } from "./pipelines";
import { baseName, MIME_TYPES } from "./naming";

export async function markdownToPdfFile(data: ArrayBuffer, fileName: string): Promise<ConversionOutputFile> {
  const markdown = new TextDecoder("utf-8").decode(data);
  const html = markdownToHtmlBody(markdown);
  const blocks = parseHtmlBlocks(html);
  const pdfBytes = await renderBlocksToPdf(blocks);
  return { name: `${baseName(fileName)}.pdf`, mimeType: MIME_TYPES.pdf, data: pdfBytes };
}

/** Splits plain text into blank-line-separated paragraphs, one PDF block each. */
function textToParagraphBlocks(text: string): HtmlBlock[] {
  const paragraphs = text
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.replaceAll(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0);
  return paragraphs.map((paragraph) => ({ kind: "paragraph", text: paragraph }) as const);
}

export async function textToPdfFile(data: ArrayBuffer, fileName: string): Promise<ConversionOutputFile> {
  const text = new TextDecoder("utf-8").decode(data);
  const blocks = textToParagraphBlocks(text);
  const pdfBytes = await renderBlocksToPdf(blocks);
  return { name: `${baseName(fileName)}.pdf`, mimeType: MIME_TYPES.pdf, data: pdfBytes };
}
