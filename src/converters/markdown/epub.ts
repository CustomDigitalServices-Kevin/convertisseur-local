// MD -> EPUB and HTML -> EPUB: single-chapter EPUB 3 packages built with
// epub-builder.ts. Fidelity "medium": structure (headings/paragraphs/lists/
// tables/emphasis/links/code -- the same tag vocabulary markdownToHtmlBody
// and htmlToMarkdown already carry) survives, but there is no chapter
// splitting by heading, no cover image and no embedded fonts.
import type { ConversionOutputFile } from "../../core/types";
import { htmlToXhtmlFragment, markdownToHtmlBody } from "./pipelines";
import { buildEpub } from "./epub-builder";
import type { EpubChapter } from "./epub-builder";
import { baseName, MIME_TYPES, titleFromFileName } from "./naming";
import { toArrayBuffer } from "../shared/binary";

function isoModifiedNow(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

async function buildSingleChapterEpub(fileName: string, bodyHtml: string): Promise<ConversionOutputFile> {
  const title = titleFromFileName(fileName);
  const bodyXhtml = await htmlToXhtmlFragment(bodyHtml);
  const chapter: EpubChapter = { id: "chapter-1", title, bodyXhtml };
  const epubBuffer = buildEpub(title, crypto.randomUUID(), isoModifiedNow(), [chapter]);
  return {
    name: `${baseName(fileName)}.epub`,
    mimeType: MIME_TYPES.epub,
    data: toArrayBuffer(new Uint8Array(epubBuffer)),
  };
}

export async function markdownToEpubFile(data: ArrayBuffer, fileName: string): Promise<ConversionOutputFile> {
  const markdown = new TextDecoder("utf-8").decode(data);
  return buildSingleChapterEpub(fileName, markdownToHtmlBody(markdown));
}

export async function htmlToEpubFile(data: ArrayBuffer, fileName: string): Promise<ConversionOutputFile> {
  const html = new TextDecoder("utf-8").decode(data);
  return buildSingleChapterEpub(fileName, html);
}
