// HTML -> MD, and DOCX -> MD (mammoth extracts DOCX structure as HTML, then
// this same DOM-free unified pipeline turns it into markdown). Fidelity:
// "high" for HTML -> MD (structural round-trip of headings/paragraphs/lists/
// tables/emphasis/links/code, the common tag vocabulary both a browser-saved
// page and marked's own output use). "preview" for DOCX -> MD, because
// mammoth itself only extracts structural text (see docx-to-pdf.ts in the
// office module for the same, already-accepted boundary): page geometry,
// most inline styling, images and headers/footers do not survive.
import mammoth from "mammoth";
import type { ConversionOutputFile } from "../../core/types";
import { ConversionError } from "../../core/types";
import { htmlToMarkdown } from "./pipelines";
import { baseName, MIME_TYPES } from "./naming";
import { toArrayBuffer } from "../shared/binary";
import { assertDocxNotPasswordProtected } from "./docx-guard";

function toMarkdownFile(fileName: string, markdown: string): ConversionOutputFile {
  return {
    name: `${baseName(fileName)}.md`,
    mimeType: MIME_TYPES.md,
    data: toArrayBuffer(new TextEncoder().encode(markdown)),
  };
}

export async function htmlToMarkdownFile(data: ArrayBuffer, fileName: string): Promise<ConversionOutputFile> {
  const html = new TextDecoder("utf-8").decode(data);
  const markdown = await htmlToMarkdown(html);
  return toMarkdownFile(fileName, markdown);
}

export async function docxToMarkdownFile(
  data: ArrayBuffer,
  fileName: string,
  reportProgress: (percent: number) => void,
): Promise<ConversionOutputFile> {
  assertDocxNotPasswordProtected(data);

  let html: string;
  try {
    // Same dual-key `{ arrayBuffer, buffer }` input as the office module's
    // docx-to-pdf.ts: mammoth's bundler-remapped zip loader accepts either
    // key depending on which of its two implementations resolution picks,
    // and Vitest's Node resolution does not reliably honor Vite's "browser"
    // field remap (documented gap), so supplying both makes this call
    // correct under either outcome instead of depending on it.
    const input = { arrayBuffer: data, buffer: data };
    const result = await mammoth.convertToHtml(input);
    html = result.value;
  } catch (error) {
    throw new ConversionError(
      "corrupted-file",
      `Failed to extract DOCX content with mammoth: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  reportProgress(50);

  const markdown = await htmlToMarkdown(html);
  reportProgress(95);
  return toMarkdownFile(fileName, markdown);
}
