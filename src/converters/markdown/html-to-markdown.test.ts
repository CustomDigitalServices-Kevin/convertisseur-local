import { describe, expect, it } from "vitest";
import mammoth from "mammoth";
import { docxToMarkdownFile, htmlToMarkdownFile } from "./html-to-markdown";
import { loadFixture } from "./fixtures";
import { ConversionError } from "../../core/types";

function toText(data: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(data);
}

describe("htmlToMarkdownFile", () => {
  it("converts the rich HTML fixture to a .md file", async () => {
    const file = await htmlToMarkdownFile(loadFixture("sample-rich.html"), "sample-rich.html");
    expect(file.name).toBe("sample-rich.md");
    expect(file.mimeType).toBe("text/markdown");
    const md = toText(file.data);
    expect(md).toContain("# Sample Rich Page");
    expect(md).toContain("Alpha item");
  });
});

describe("docxToMarkdownFile", () => {
  it("extracts the DOCX fixture heading and paragraphs as markdown", async () => {
    const progress: number[] = [];
    const file = await docxToMarkdownFile(loadFixture("sample.docx"), "sample.docx", (p) => progress.push(p));
    expect(file.name).toBe("sample.md");
    const md = toText(file.data);
    expect(md).toContain("Convertisseur Local Fixture");
    expect(md).toContain("minimal DOCX fixture");
    expect(progress.length).toBeGreaterThan(0);
  });

  it("rejects a password-protected (OLE/CFB) file with a stable error code", async () => {
    const cfb = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
    await expect(docxToMarkdownFile(cfb.buffer, "protected.docx", () => undefined)).rejects.toMatchObject({
      code: "password-protected",
    } satisfies Partial<ConversionError>);
  });

  it("rejects a non-DOCX/non-zip file as corrupted", async () => {
    const garbage = new Uint8Array([9, 9, 9, 9, 9, 9, 9, 9]);
    await expect(docxToMarkdownFile(garbage.buffer, "garbage.docx", () => undefined)).rejects.toMatchObject({
      code: "corrupted-file",
    } satisfies Partial<ConversionError>);
  });
});

describe("markdown -> docx -> markdown round trip via mammoth", () => {
  it("keeps the heading text readable by mammoth after a docx produced elsewhere", async () => {
    // Sanity check that mammoth (used for DOCX -> MD) can read a DOCX this
    // team also produces for MD -> DOCX -- exercised end to end in
    // markdown-to-docx.test.ts; here we only confirm mammoth itself parses
    // the existing office fixture without our module in the loop. Same
    // dual-key input as docx-to-pdf.ts / html-to-markdown.ts: a separately
    // typed const (not an inline literal) so the excess-property check does
    // not reject the extra key.
    const docxData = loadFixture("sample.docx");
    const input = { arrayBuffer: docxData, buffer: docxData };
    const result = await mammoth.convertToHtml(input);
    expect(result.value).toContain("Convertisseur Local Fixture");
  });
});
