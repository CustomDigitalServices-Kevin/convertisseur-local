import { describe, expect, it } from "vitest";
import { Document, Packer } from "docx";
import mammoth from "mammoth";
import type { HtmlBlock } from "../shared/html-blocks";
import { blocksToDocxChildren } from "./blocks-to-docx";

async function toDocxBuffer(blocks: HtmlBlock[]): Promise<ArrayBuffer> {
  const children = blocksToDocxChildren(blocks);
  const document = new Document({ sections: [{ children }] });
  return Packer.toArrayBuffer(document);
}

describe("blocksToDocxChildren", () => {
  it("produces a DOCX mammoth can read back with heading, paragraph, list and table text", async () => {
    const blocks: HtmlBlock[] = [
      { kind: "heading", level: 1, text: "Report" },
      { kind: "paragraph", text: "Body text." },
      { kind: "listItem", text: "First item" },
      { kind: "table", rows: [["Name", "Amount"], ["Alice", "100"]] },
    ];
    const buffer = await toDocxBuffer(blocks);
    // Separately typed const (not an inline literal): see the comment on
    // readerInput in markdown-to-docx.test.ts for why.
    const input = { arrayBuffer: buffer, buffer };
    const result = await mammoth.convertToHtml(input);
    expect(result.value).toContain("Report");
    expect(result.value).toContain("Body text.");
    expect(result.value).toContain("First item");
    expect(result.value).toContain("Alice");
  });

  it("produces valid, non-empty output for an empty block list", async () => {
    const buffer = await toDocxBuffer([]);
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
