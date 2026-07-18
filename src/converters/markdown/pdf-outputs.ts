// PDF -> MD, PDF -> DOCX, PDF -> TXT: all three share the same heuristic
// block extraction (pdf-extract.ts) and only differ in the final
// serializer. Fidelity "preview" for all three (see module.ts): the source
// is reconstructed from font-size/position heuristics, not real structure.
import { Document, Packer, Paragraph } from "docx";
import type { ConversionOutputFile } from "../../core/types";
import { extractPdfBlocks } from "./pdf-extract";
import { blocksToMarkdown, blocksToText } from "./blocks-to-outputs";
import { blocksToDocxChildren } from "./blocks-to-docx";
import { baseName, MIME_TYPES } from "./naming";
import { toArrayBuffer } from "../shared/binary";

export async function pdfToMarkdownFile(
  data: ArrayBuffer,
  fileName: string,
  reportProgress: (percent: number) => void,
): Promise<ConversionOutputFile> {
  const blocks = await extractPdfBlocks(data, reportProgress);
  const markdown = blocksToMarkdown(blocks);
  return {
    name: `${baseName(fileName)}.md`,
    mimeType: MIME_TYPES.md,
    data: toArrayBuffer(new TextEncoder().encode(markdown)),
  };
}

export async function pdfToTextFile(
  data: ArrayBuffer,
  fileName: string,
  reportProgress: (percent: number) => void,
): Promise<ConversionOutputFile> {
  const blocks = await extractPdfBlocks(data, reportProgress);
  const text = blocksToText(blocks);
  return {
    name: `${baseName(fileName)}.txt`,
    mimeType: MIME_TYPES.txt,
    data: toArrayBuffer(new TextEncoder().encode(text)),
  };
}

export async function pdfToDocxFile(
  data: ArrayBuffer,
  fileName: string,
  reportProgress: (percent: number) => void,
): Promise<ConversionOutputFile> {
  const blocks = await extractPdfBlocks(data, reportProgress);
  const children = blocksToDocxChildren(blocks);
  const document = new Document({
    sections: [{ children: children.length > 0 ? children : [new Paragraph("")] }],
  });
  const buffer = await Packer.toArrayBuffer(document);
  reportProgress(100);
  return {
    name: `${baseName(fileName)}.docx`,
    mimeType: MIME_TYPES.docx,
    data: toArrayBuffer(new Uint8Array(buffer)),
  };
}
