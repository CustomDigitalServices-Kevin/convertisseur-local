import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderBlocksToPdf } from "./pdf-render";
import { extractPdfText } from "./pdf-inspect-test-helper";
import type { HtmlBlock } from "./html-blocks";

describe("renderBlocksToPdf", () => {
  it("produces a valid, non-empty PDF for an empty block list", async () => {
    const bytes = await renderBlocksToPdf([]);
    expect(bytes.byteLength).toBeGreaterThan(0);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
  });

  it("draws heading and paragraph text extractably", async () => {
    const blocks: HtmlBlock[] = [
      { kind: "heading", level: 1, text: "Report Title" },
      { kind: "paragraph", text: "This is the body paragraph." },
    ];
    const bytes = await renderBlocksToPdf(blocks);
    const text = extractPdfText(bytes);
    expect(text).toContain("Report Title");
    expect(text).toContain("This is the body paragraph.");
  });

  it("draws list items with a bullet prefix", async () => {
    const blocks: HtmlBlock[] = [
      { kind: "listItem", text: "First item" },
      { kind: "listItem", text: "Second item" },
    ];
    const bytes = await renderBlocksToPdf(blocks);
    const text = extractPdfText(bytes);
    expect(text).toContain("First item");
    expect(text).toContain("Second item");
  });

  it("draws table rows with extractable cell text", async () => {
    const blocks: HtmlBlock[] = [
      { kind: "table", rows: [["Name", "Amount"], ["Alice", "100"]] },
    ];
    const bytes = await renderBlocksToPdf(blocks);
    const text = extractPdfText(bytes);
    expect(text).toContain("Name");
    expect(text).toContain("Amount");
    expect(text).toContain("Alice");
    expect(text).toContain("100");
  });

  it("paginates across multiple pages when content overflows one page", async () => {
    const blocks: HtmlBlock[] = Array.from({ length: 120 }, (_, i) => ({
      kind: "paragraph" as const,
      text: `Paragraph number ${String(i)} with enough text to take real vertical space on the page.`,
    }));
    const bytes = await renderBlocksToPdf(blocks);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(1);
    const text = extractPdfText(bytes);
    expect(text).toContain("Paragraph number 0");
    expect(text).toContain("Paragraph number 119");
  });
});
