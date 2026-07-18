// DOCX -> PDF, preview mode. docx-preview (the library named in the brief)
// renders into a live DOM element and cannot run inside a DOM-less Web
// Worker, so structure/text is extracted instead with mammoth, which is
// explicitly documented to work without a DOM. The resulting HTML is
// rendered through the same text-layout PDF pipeline used by xlsx -> pdf.
// Fidelity is "preview": headings/paragraphs/lists/tables and their text
// survive; page geometry, fonts, images and inline styling do not.
import mammoth from "mammoth";
import type { ConversionOutputFile } from "../../core/types";
import { ConversionError } from "../../core/types";
import { parseHtmlBlocks } from "../shared/html-blocks";
import { renderBlocksToPdf } from "../shared/pdf-render";
import { baseName, MIME_TYPES } from "./naming";
import { assertNotPasswordProtected } from "./ooxml";

export async function docxToPdfFile(
  data: ArrayBuffer,
  fileName: string,
  reportProgress: (percent: number) => void,
): Promise<ConversionOutputFile> {
  assertNotPasswordProtected(data, "DOCX");

  let html: string;
  try {
    // mammoth ships two zip-loading implementations selected by bundlers via
    // package.json's legacy "browser" field remapping
    // (lib/unzip.js accepts { buffer }, browser/unzip.js accepts
    // { arrayBuffer }; both ultimately hand the value straight to
    // JSZip.loadAsync, which accepts an ArrayBuffer either way). That
    // remapping is a bundler convention Vite's production build honors, but
    // Vitest's Node-based test resolution does not reliably apply it (a
    // known Vite/Vitest gap). Supplying both keys makes this call correct
    // under either resolution outcome instead of depending on which one a
    // given tool picked. Declared as a variable (not an inline literal) so
    // TypeScript's excess-property check does not reject the extra key.
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

  const blocks = parseHtmlBlocks(html);
  const pdfBytes = await renderBlocksToPdf(blocks);
  reportProgress(95);

  return { name: `${baseName(fileName)}.pdf`, mimeType: MIME_TYPES.pdf, data: pdfBytes };
}
