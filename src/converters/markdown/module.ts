// Markdown converter module (T10 / task 10): MD<->HTML, MD->DOCX, MD->PDF,
// DOCX->MD, PDF->MD/DOCX/TXT, TXT<->MD/PDF, HTML->TXT/EPUB, MD->EPUB.
// Registered in ../../workers/module-loaders.ts under "markdown". See
// src/core/README.md for the ConverterModule contract every family
// implements.
//
// EPUB decision: the registry allows md/html -> epub. epub-gen-memory (the
// library named in the original brief) was installed and empirically
// tested (a throwaway vitest spec that has since been removed) via its
// `epub-gen-memory/bundle` browser entry. It generated a valid-looking
// Blob under vitest's happy-dom environment, but its browser HTML-parsing
// path (dist/lib/util/html-parse-browser.js, invoked on every chapter) calls
// `new DOMParser()`, and DOMParser is `[Exposed=Window]` only per the DOM
// Parsing and Serialization spec -- it does not exist in a dedicated Web
// Worker in any browser. The happy-dom pass was a false positive: happy-dom
// polyfills a global `window`/`DOMParser` even in a "worker"-labelled test,
// which a real browser Worker global scope does not provide. Confirmed via
// https://developer.mozilla.org/en-US/docs/Web/API/DOMParser and the WHATWG
// DOM Parsing spec before ruling it out (no guessing). epub-gen-memory was
// uninstalled; the EPUB module below builds the container directly with
// fflate (epub-builder.ts), which needs no DOM at all.
import type { ConverterModule } from "../../core/converter-module";
import type { ConversionOutputFile, ConversionRequest, Fidelity } from "../../core/types";
import { ConversionError } from "../../core/types";
import { markdownToHtmlFile } from "./markdown-to-html";
import { htmlToMarkdownFile, docxToMarkdownFile } from "./html-to-markdown";
import { markdownToDocxFile } from "./markdown-to-docx";
import { markdownToPdfFile, textToPdfFile } from "./to-pdf";
import { markdownToTextFile, htmlToTextFile, textToMarkdownFile } from "./plain-text";
import { pdfToMarkdownFile, pdfToDocxFile, pdfToTextFile } from "./pdf-outputs";
import { markdownToEpubFile, htmlToEpubFile } from "./epub";

interface ConvertResult {
  files: ConversionOutputFile[];
  fidelity: Fidelity;
}

async function dispatch(
  request: ConversionRequest,
  reportProgress: (percent: number) => void,
): Promise<ConvertResult> {
  const { sourceFormat, targetFormat, data, fileName } = request;

  if (sourceFormat === "md" && targetFormat === "html") {
    return { files: [markdownToHtmlFile(data, fileName)], fidelity: "high" };
  }
  if (sourceFormat === "html" && targetFormat === "md") {
    return { files: [await htmlToMarkdownFile(data, fileName)], fidelity: "high" };
  }
  if (sourceFormat === "docx" && targetFormat === "md") {
    return { files: [await docxToMarkdownFile(data, fileName, reportProgress)], fidelity: "preview" };
  }
  if (sourceFormat === "md" && targetFormat === "docx") {
    return { files: [await markdownToDocxFile(data, fileName)], fidelity: "medium" };
  }
  if (sourceFormat === "md" && targetFormat === "pdf") {
    return { files: [await markdownToPdfFile(data, fileName)], fidelity: "medium" };
  }
  if (sourceFormat === "txt" && targetFormat === "pdf") {
    return { files: [await textToPdfFile(data, fileName)], fidelity: "medium" };
  }
  if (sourceFormat === "md" && targetFormat === "txt") {
    return { files: [markdownToTextFile(data, fileName)], fidelity: "high" };
  }
  if (sourceFormat === "html" && targetFormat === "txt") {
    return { files: [htmlToTextFile(data, fileName)], fidelity: "high" };
  }
  if (sourceFormat === "txt" && targetFormat === "md") {
    return { files: [textToMarkdownFile(data, fileName)], fidelity: "high" };
  }
  if (sourceFormat === "pdf" && targetFormat === "md") {
    return { files: [await pdfToMarkdownFile(data, fileName, reportProgress)], fidelity: "preview" };
  }
  if (sourceFormat === "pdf" && targetFormat === "docx") {
    return { files: [await pdfToDocxFile(data, fileName, reportProgress)], fidelity: "preview" };
  }
  if (sourceFormat === "pdf" && targetFormat === "txt") {
    return { files: [await pdfToTextFile(data, fileName, reportProgress)], fidelity: "preview" };
  }
  if (sourceFormat === "md" && targetFormat === "epub") {
    return { files: [await markdownToEpubFile(data, fileName)], fidelity: "medium" };
  }
  if (sourceFormat === "html" && targetFormat === "epub") {
    return { files: [await htmlToEpubFile(data, fileName)], fidelity: "medium" };
  }

  throw new ConversionError(
    "unsupported-conversion",
    `Markdown module cannot convert ${sourceFormat} to ${targetFormat}`,
  );
}

export const markdownModule: ConverterModule = {
  async convert(request, reportProgress) {
    const result = await dispatch(request, reportProgress);
    reportProgress(100);
    return result;
  },
};
