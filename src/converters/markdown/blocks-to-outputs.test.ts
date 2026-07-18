import { describe, expect, it } from "vitest";
import type { HtmlBlock } from "../shared/html-blocks";
import { blocksToMarkdown, blocksToText } from "./blocks-to-outputs";

const BLOCKS: HtmlBlock[] = [
  { kind: "heading", level: 2, text: "Title" },
  { kind: "paragraph", text: "A paragraph." },
  { kind: "listItem", text: "An item" },
  { kind: "table", rows: [["Col A", "Col B"], ["1", "2"]] },
];

describe("blocksToMarkdown", () => {
  it("renders each block kind with the right markdown syntax", () => {
    const md = blocksToMarkdown(BLOCKS);
    expect(md).toContain("## Title");
    expect(md).toContain("A paragraph.");
    expect(md).toContain("- An item");
    expect(md).toContain("| Col A | Col B |");
    expect(md).toContain("| 1 | 2 |");
  });

  it("escapes markdown-significant characters inside table cells", () => {
    const md = blocksToMarkdown([{ kind: "table", rows: [["a|b", "c*d"]] }]);
    const backslash = String.fromCharCode(92);
    expect(md).toContain(`a${backslash}|b`);
    expect(md).toContain(`c${backslash}*d`);
  });

  it("returns an empty string for no blocks", () => {
    expect(blocksToMarkdown([])).toBe("");
  });
});

describe("blocksToText", () => {
  it("renders heading and paragraph as plain lines, list items with a dash", () => {
    const text = blocksToText(BLOCKS);
    expect(text).toContain("Title");
    expect(text).not.toContain("##");
    expect(text).toContain("A paragraph.");
    expect(text).toContain("- An item");
    expect(text).toContain("Col A\tCol B");
  });
});
