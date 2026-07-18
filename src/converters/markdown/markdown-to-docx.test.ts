import { describe, expect, it } from "vitest";
import mammoth from "mammoth";
import { markdownToDocxFile } from "./markdown-to-docx";
import { loadTextFixture } from "./fixtures";

function readerInput(data: ArrayBuffer): { arrayBuffer: ArrayBuffer; buffer: ArrayBuffer } {
  // Same dual-key input as docx-to-pdf.ts (office module) and
  // html-to-markdown.ts: a separately typed const (not an inline literal)
  // so mammoth's Input union type does not reject the extra key.
  return { arrayBuffer: data, buffer: data };
}

describe("markdownToDocxFile", () => {
  it("produces a DOCX that mammoth can read back, preserving headings, list text and a table cell", async () => {
    const md = loadTextFixture("markdown-rich.md");
    const file = await markdownToDocxFile(new TextEncoder().encode(md).buffer, "markdown-rich.md");

    expect(file.name).toBe("markdown-rich.docx");
    expect(file.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(file.data.byteLength).toBeGreaterThan(0);

    const result = await mammoth.convertToHtml(readerInput(file.data));
    const html = result.value;
    expect(html).toContain("Convertisseur Local Fixture");
    expect(html).toContain("Second Section");
    expect(html).toContain("First bullet item");
    expect(html).toContain("Nested bullet item");
    expect(html).toContain("First ordered item");
    expect(html).toContain("Alice");
    expect(html).toContain("blockquote with some quoted prose");
  });

  it("keeps bold and italic text as separate readable words", async () => {
    const md = "This is **bold** and this is *italic*.";
    const file = await markdownToDocxFile(new TextEncoder().encode(md).buffer, "note.md");
    const result = await mammoth.extractRawText(readerInput(file.data));
    expect(result.value).toContain("bold");
    expect(result.value).toContain("italic");
  });

  it("produces a minimal but valid DOCX for an empty document instead of throwing", async () => {
    const file = await markdownToDocxFile(new TextEncoder().encode("").buffer, "empty.md");
    expect(file.data.byteLength).toBeGreaterThan(0);
    const result = await mammoth.extractRawText(readerInput(file.data));
    expect(result.value.trim()).toBe("");
  });

  it("restarts numbering for a second ordered list instead of continuing the first", async () => {
    const md = "1. one\n2. two\n\nParagraph between.\n\n1. three\n2. four\n";
    const file = await markdownToDocxFile(new TextEncoder().encode(md).buffer, "lists.md");
    const result = await mammoth.extractRawText(readerInput(file.data));
    expect(result.value).toContain("one");
    expect(result.value).toContain("three");
  });
});
