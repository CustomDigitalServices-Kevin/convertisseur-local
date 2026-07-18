import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { htmlToEpubFile, markdownToEpubFile } from "./epub";
import { loadFixture } from "./fixtures";

function textOf(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes);
}

describe("markdownToEpubFile", () => {
  it("produces a dezippable EPUB with the heading and list content, correct mimetype", async () => {
    const file = await markdownToEpubFile(loadFixture("markdown-rich.md"), "markdown-rich.md");
    expect(file.name).toBe("markdown-rich.epub");
    expect(file.mimeType).toBe("application/epub+zip");

    const entries = unzipSync(new Uint8Array(file.data));
    expect(textOf(entries.mimetype ?? new Uint8Array())).toBe("application/epub+zip");
    const chapter = textOf(entries["OEBPS/chapter-1.xhtml"] ?? new Uint8Array());
    expect(chapter).toContain("Convertisseur Local Fixture");
    expect(chapter).toContain("First bullet item");
    // Well-formed XHTML: void elements self-closed, no bare <li> etc left open
    // by the fragment-mode round trip.
    expect(chapter).not.toMatch(/<br>(?!\/)/);
  });
});

describe("htmlToEpubFile", () => {
  it("produces a dezippable EPUB without duplicating the html/head/body wrapper", async () => {
    const file = await htmlToEpubFile(loadFixture("sample-rich.html"), "sample-rich.html");
    expect(file.name).toBe("sample-rich.epub");

    const entries = unzipSync(new Uint8Array(file.data));
    const chapter = textOf(entries["OEBPS/chapter-1.xhtml"] ?? new Uint8Array());
    expect(chapter).toContain("Sample Rich Page");
    expect(chapter).toContain("Alpha item");
    // Exactly one <html> wrapper (epub-builder's own chapter template), not
    // a second one nested from the source document's own <html> tag.
    const htmlOpenCount = (chapter.match(/<html/g) ?? []).length;
    expect(htmlOpenCount).toBe(1);
  });
});
