import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { buildEpub } from "./epub-builder";
import type { EpubChapter } from "./epub-builder";

function textOf(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes);
}

describe("buildEpub", () => {
  it("produces a zip whose first, stored, uncompressed entry is the mimetype file", () => {
    const chapters: EpubChapter[] = [{ id: "chapter-1", title: "Intro", bodyXhtml: "<p>Hello</p>" }];
    const buffer = buildEpub("My Book", "11111111-1111-1111-1111-111111111111", "2026-01-01T00:00:00Z", chapters);
    const bytes = new Uint8Array(buffer);

    // Local file header signature PK\x03\x04, then skip to the compression
    // method field (offset 8, 2 bytes little-endian): 0 means "stored".
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const compressionMethod = bytes[8] ?? -1;
    expect(compressionMethod).toBe(0);

    // The file name follows the 30-byte local header; "mimetype" (8 bytes)
    // must be the very first name in the archive.
    const nameLength = (bytes[26] ?? 0) | ((bytes[27] ?? 0) << 8);
    const name = textOf(bytes.slice(30, 30 + nameLength));
    expect(name).toBe("mimetype");
  });

  it("is dezippable and contains container.xml, content.opf, nav.xhtml and each chapter", () => {
    const chapters: EpubChapter[] = [
      { id: "chapter-1", title: "First", bodyXhtml: "<p>One</p>" },
      { id: "chapter-2", title: "Second", bodyXhtml: "<p>Two</p>" },
    ];
    const buffer = buildEpub("Two Chapters", "22222222-2222-2222-2222-222222222222", "2026-01-01T00:00:00Z", chapters);
    const entries = unzipSync(new Uint8Array(buffer));

    expect(textOf(entries.mimetype ?? new Uint8Array())).toBe("application/epub+zip");
    expect(Object.keys(entries)).toContain("META-INF/container.xml");
    expect(Object.keys(entries)).toContain("OEBPS/content.opf");
    expect(Object.keys(entries)).toContain("OEBPS/nav.xhtml");
    expect(Object.keys(entries)).toContain("OEBPS/chapter-1.xhtml");
    expect(Object.keys(entries)).toContain("OEBPS/chapter-2.xhtml");

    const containerXml = textOf(entries["META-INF/container.xml"] ?? new Uint8Array());
    expect(containerXml).toContain("OEBPS/content.opf");

    const opf = textOf(entries["OEBPS/content.opf"] ?? new Uint8Array());
    expect(opf).toContain("urn:uuid:22222222-2222-2222-2222-222222222222");
    expect(opf).toContain("<dc:title>Two Chapters</dc:title>");
    expect(opf).toContain('properties="nav"');

    const chapter1 = textOf(entries["OEBPS/chapter-1.xhtml"] ?? new Uint8Array());
    expect(chapter1).toContain("<p>One</p>");
  });
});
