import { describe, expect, it } from "vitest";
import { markdownToHtmlFile } from "./markdown-to-html";
import { loadFixture } from "./fixtures";

function toText(data: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(data);
}

describe("markdownToHtmlFile", () => {
  it("produces a standalone HTML document with no external references", () => {
    const file = markdownToHtmlFile(loadFixture("markdown-rich.md"), "markdown-rich.md");
    expect(file.name).toBe("markdown-rich.html");
    expect(file.mimeType).toBe("text/html");

    const html = toText(file.data);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<h1>Convertisseur Local Fixture</h1>");
    expect(html).toContain("<table>");
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/);
    expect(html).not.toMatch(/<script[^>]+src=/);
  });

  it("derives the document title from the file name and escapes it", () => {
    const file = markdownToHtmlFile(new TextEncoder().encode("# Hi").buffer, "my_report-v2.md");
    const html = toText(file.data);
    expect(html).toContain("<title>my report v2</title>");
  });
});
