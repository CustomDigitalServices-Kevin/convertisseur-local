import { describe, expect, it } from "vitest";
import type { Line, TextItemLike } from "./pdf-extract";
import { bodySizeOf, blocksFromPagesLines, headingLevelsBySize, linesFromItems } from "./pdf-extract";

// PDF text coordinates: origin bottom-left, y increases upward, so a page
// read top to bottom has *decreasing* y between successive lines -- these
// fixtures follow that convention (matches the real pdfjs-dist item shape).
function item(str: string, y: number, size: number, hasEOL = false): TextItemLike {
  return { str, transform: [size, 0, 0, size, 48, y], hasEOL };
}

describe("linesFromItems", () => {
  it("keeps items on the same y as one line and joins them with a space", () => {
    const lines = linesFromItems([item("Hello", 800, 11), item("world", 800, 11)]);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.text).toBe("Hello world");
  });

  it("starts a new line when y changes beyond tolerance", () => {
    const lines = linesFromItems([item("Line one", 800, 11), item("Line two", 780, 11)]);
    expect(lines).toHaveLength(2);
    expect(lines.map((l) => l.text)).toEqual(["Line one", "Line two"]);
  });

  it("forces a break on hasEOL even without a y change", () => {
    const lines = linesFromItems([item("First", 800, 11, true), item("Second", 800, 11)]);
    expect(lines).toHaveLength(2);
  });

  it("ignores whitespace-only lines", () => {
    const lines = linesFromItems([item("   ", 800, 11)]);
    expect(lines).toHaveLength(0);
  });
});

describe("bodySizeOf", () => {
  it("picks the most frequent rounded font size as the body size", () => {
    const lines: Line[] = [
      { text: "Title", y: 800, fontSize: 24 },
      { text: "Body one", y: 780, fontSize: 11 },
      { text: "Body two", y: 760, fontSize: 11 },
      { text: "Body three", y: 740, fontSize: 11.1 },
    ];
    expect(bodySizeOf(lines)).toBe(11);
  });
});

describe("headingLevelsBySize", () => {
  it("ranks distinct larger sizes into heading levels 1..6, capped at 6", () => {
    const lines: Line[] = Array.from({ length: 8 }, (_, index) => ({
      text: `Heading ${String(index)}`,
      y: 800 - index * 20,
      fontSize: 30 - index,
    }));
    const levels = headingLevelsBySize(lines, 10);
    expect(levels.get(30)).toBe(1);
    expect(levels.get(29)).toBe(2);
    expect(levels.get(23)).toBe(6);
    expect(levels.get(24)).toBe(6);
  });

  it("does not classify body-sized or smaller lines as headings", () => {
    const lines: Line[] = [{ text: "Body", y: 800, fontSize: 11 }];
    const levels = headingLevelsBySize(lines, 11);
    expect(levels.size).toBe(0);
  });
});

describe("blocksFromPagesLines", () => {
  it("turns a title line and two body lines into a heading block and one merged paragraph", () => {
    const pageLines: Line[] = [
      { text: "Report Title", y: 800, fontSize: 24 },
      { text: "First sentence of the paragraph.", y: 770, fontSize: 11 },
      { text: "Second sentence, same paragraph.", y: 756, fontSize: 11 },
    ];
    const blocks = blocksFromPagesLines([pageLines]);
    expect(blocks).toEqual([
      { kind: "heading", level: 1, text: "Report Title" },
      { kind: "paragraph", text: "First sentence of the paragraph. Second sentence, same paragraph." },
    ]);
  });

  it("splits into a new paragraph when the vertical gap is large", () => {
    const pageLines: Line[] = [
      { text: "First paragraph.", y: 800, fontSize: 11 },
      { text: "Second paragraph after a big gap.", y: 760, fontSize: 11 },
    ];
    const blocks = blocksFromPagesLines([pageLines]);
    expect(blocks).toEqual([
      { kind: "paragraph", text: "First paragraph." },
      { kind: "paragraph", text: "Second paragraph after a big gap." },
    ]);
  });

  it("returns no blocks for a page with no lines", () => {
    expect(blocksFromPagesLines([[]])).toEqual([]);
  });
});
