import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { markdownToPdfFile, textToPdfFile } from "./to-pdf";
import { extractPdfText } from "./pdf-text-inspect-test-helper";
import { loadTextFixture } from "./fixtures";

describe("markdownToPdfFile", () => {
  it("produces a non-empty PDF with extractable heading and paragraph text", async () => {
    const md = loadTextFixture("markdown-rich.md");
    const file = await markdownToPdfFile(new TextEncoder().encode(md).buffer, "markdown-rich.md");

    expect(file.name).toBe("markdown-rich.pdf");
    expect(file.mimeType).toBe("application/pdf");
    expect(file.data.byteLength).toBeGreaterThan(0);

    const doc = await PDFDocument.load(file.data);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);

    const text = extractPdfText(file.data);
    expect(text).toContain("Convertisseur Local Fixture");
    expect(text).toContain("bold");
  });
});

describe("textToPdfFile", () => {
  it("renders each blank-line-separated paragraph and produces extractable text", async () => {
    const text = "First paragraph line.\n\nSecond paragraph, different block.";
    const file = await textToPdfFile(new TextEncoder().encode(text).buffer, "notes.txt");

    expect(file.name).toBe("notes.pdf");
    const doc = await PDFDocument.load(file.data);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);

    const extracted = extractPdfText(file.data);
    expect(extracted).toContain("First paragraph line");
    expect(extracted).toContain("Second paragraph");
  });

  it("still produces a valid PDF for empty input", async () => {
    const file = await textToPdfFile(new TextEncoder().encode("").buffer, "empty.txt");
    const doc = await PDFDocument.load(file.data);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
