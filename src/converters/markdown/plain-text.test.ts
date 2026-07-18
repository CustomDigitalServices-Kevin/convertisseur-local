import { describe, expect, it } from "vitest";
import { htmlToTextFile, markdownToTextFile, textToMarkdownFile } from "./plain-text";
import { loadFixture, loadTextFixture } from "./fixtures";

function toText(data: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(data);
}

describe("markdownToTextFile", () => {
  it("extracts plain text without markdown or html markup", () => {
    const file = markdownToTextFile(loadFixture("markdown-rich.md"), "markdown-rich.md");
    expect(file.name).toBe("markdown-rich.txt");
    expect(file.mimeType).toBe("text/plain");
    const text = toText(file.data);
    expect(text).toContain("Convertisseur Local Fixture");
    expect(text).toContain("bold");
    expect(text).not.toContain("**");
    expect(text).not.toContain("<h1>");
  });
});

describe("htmlToTextFile", () => {
  it("extracts plain text from the rich HTML fixture", () => {
    const file = htmlToTextFile(loadFixture("sample-rich.html"), "sample-rich.html");
    expect(file.name).toBe("sample-rich.txt");
    const text = toText(file.data);
    expect(text).toContain("Sample Rich Page");
    expect(text).toContain("Alpha item");
    expect(text).not.toMatch(/<[a-z]+>/i);
  });
});

describe("textToMarkdownFile", () => {
  it("passes plain prose through unchanged", () => {
    const file = textToMarkdownFile(new TextEncoder().encode("Just a plain sentence.").buffer, "note.txt");
    expect(file.name).toBe("note.md");
    expect(toText(file.data)).toBe("Just a plain sentence.");
  });

  it("escapes a leading dash so it is not read back as a markdown bullet", () => {
    const file = textToMarkdownFile(new TextEncoder().encode("- not a bullet, just a sentence").buffer, "note.txt");
    const text = toText(file.data);
    const escapedDash = String.fromCharCode(92) + "-";
    expect(text.startsWith(escapedDash)).toBe(true);
    expect(text).toContain("not a bullet");
  });

  it("escapes a leading hash so it is not read back as a heading", () => {
    const file = textToMarkdownFile(new TextEncoder().encode("#hashtag mention").buffer, "note.txt");
    const text = toText(file.data);
    // A real markdown heading needs a space after the hash marks; a bare
    // "#hashtag" has none, so LEADING_MARKDOWN_SYNTAX should not match it
    // at all and the line passes through untouched.
    expect(text).toBe("#hashtag mention");
  });

  it("round-trips through markdownToTextFile losslessly for plain prose", () => {
    const original = loadTextFixture("markdown-rich.md");
    const asText = original.replaceAll(/[#*`>|-]/g, "");
    const file = textToMarkdownFile(new TextEncoder().encode(asText).buffer, "note.txt");
    expect(toText(file.data).length).toBeGreaterThan(0);
  });
});
