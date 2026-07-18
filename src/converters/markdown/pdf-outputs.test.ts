// pdfToMarkdownFile/pdfToDocxFile/pdfToTextFile call extractPdfBlocks,
// which loads a real PDF through the *generic* pdfjs-dist build (via
// pdf-pdfjs-runtime.ts's `?url` worker asset). That resolution needs a real
// browser or dev server: under Vitest's Node-based runner it fails to
// resolve the worker module (verified directly: "Cannot find module
// '...pdf.worker.min.mjs'..."), the exact same class of limitation
// documented in src/converters/pdf/pdfjs-parsing.test.ts and
// pdf-merge-split.test.ts for the pdf module team's own `?url`-dependent
// code. The heuristic itself (extractPdfBlocks's building blocks) is
// thoroughly unit-tested with synthetic data in pdf-extract.test.ts and
// needs no PDF loading at all.
//
// What is tested here instead: extractPdfBlocks is mocked at the module
// boundary (its own correctness is not this file's concern) to verify
// pdf-outputs.ts wires its result into the right serializer, with the
// right output file name/MIME type/fidelity for each of the three targets.
import { describe, expect, it, vi } from "vitest";
import type { HtmlBlock } from "../shared/html-blocks";

const FAKE_BLOCKS: HtmlBlock[] = [
  { kind: "heading", level: 1, text: "Fixture Title" },
  { kind: "paragraph", text: "Body sentence." },
];

vi.mock("./pdf-extract", () => ({
  extractPdfBlocks: vi.fn((_data: ArrayBuffer, reportProgress: (p: number) => void) => {
    reportProgress(50);
    return Promise.resolve(FAKE_BLOCKS);
  }),
}));

const { pdfToDocxFile, pdfToMarkdownFile, pdfToTextFile } = await import("./pdf-outputs");
const mammoth = (await import("mammoth")).default;

function toText(data: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(data);
}

describe("pdfToMarkdownFile", () => {
  it("serializes the extracted blocks as markdown", async () => {
    const progress: number[] = [];
    const file = await pdfToMarkdownFile(new ArrayBuffer(0), "sample-text.pdf", (p) => progress.push(p));
    expect(file.name).toBe("sample-text.md");
    expect(file.mimeType).toBe("text/markdown");
    expect(toText(file.data)).toContain("# Fixture Title");
    expect(toText(file.data)).toContain("Body sentence.");
    expect(progress).toContain(50);
  });
});

describe("pdfToTextFile", () => {
  it("serializes the extracted blocks as plain text", async () => {
    const file = await pdfToTextFile(new ArrayBuffer(0), "sample-text.pdf", () => undefined);
    expect(file.name).toBe("sample-text.txt");
    expect(file.mimeType).toBe("text/plain");
    const text = toText(file.data);
    expect(text).toContain("Fixture Title");
    expect(text).not.toContain("#");
  });
});

describe("pdfToDocxFile", () => {
  it("serializes the extracted blocks into a DOCX mammoth can read back", async () => {
    const file = await pdfToDocxFile(new ArrayBuffer(0), "sample-text.pdf", () => undefined);
    expect(file.name).toBe("sample-text.docx");
    const docxData = file.data;
    const input = { arrayBuffer: docxData, buffer: docxData };
    const result = await mammoth.convertToHtml(input);
    expect(result.value).toContain("Fixture Title");
    expect(result.value).toContain("Body sentence.");
  });
});
