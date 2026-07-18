import { describe, expect, it } from "vitest";
import { htmlToMarkdown, htmlToPlainText, htmlToXhtmlFragment, markdownToHtmlBody } from "./pipelines";
import { loadTextFixture } from "./fixtures";

const TABLE_SEPARATOR_ROW = /\|\s*-+\s*\|/;

describe("markdownToHtmlBody", () => {
  it("renders headings, lists, tables, code and links from the rich fixture", () => {
    const md = loadTextFixture("markdown-rich.md");
    const html = markdownToHtmlBody(md);
    expect(html).toContain("<h1>Convertisseur Local Fixture</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<code>inline code</code>");
    expect(html).toContain("<table>");
    expect(html).toContain('<a href="https://example.com/">link</a>');
  });
});

describe("htmlToMarkdown", () => {
  it("converts the rich HTML fixture into markdown headings, lists and a table", async () => {
    const html = loadTextFixture("sample-rich.html");
    const md = await htmlToMarkdown(html);
    expect(md).toContain("# Sample Rich Page");
    expect(md).toContain("**bold**");
    expect(md).toContain("*italic*");
    expect(md).toContain("Alpha item");
    expect(md).toContain("Col A");
    expect(md).toMatch(TABLE_SEPARATOR_ROW);
  });

  it("round-trips markdown -> html -> markdown, preserving the heading and a list item", async () => {
    const md = loadTextFixture("markdown-rich.md");
    const html = markdownToHtmlBody(md);
    const roundTripped = await htmlToMarkdown(html);
    expect(roundTripped).toContain("# Convertisseur Local Fixture");
    expect(roundTripped).toContain("First bullet item");
  });
});

describe("htmlToPlainText", () => {
  it("extracts visible text from the AST, without any HTML tags leaking through", () => {
    const html = loadTextFixture("sample-rich.html");
    const text = htmlToPlainText(html);
    expect(text).toContain("Sample Rich Page");
    expect(text).toContain("bold");
    expect(text).toContain("Alpha item");
    expect(text).not.toMatch(/<[a-z]+>/i);
  });

  it("returns an empty string for empty input rather than throwing", () => {
    expect(htmlToPlainText("")).toBe("");
  });
});

describe("htmlToXhtmlFragment", () => {
  it("self-closes void elements so the result is well-formed XML", async () => {
    const xhtml = await htmlToXhtmlFragment('<p>line one<br>line two<img src="x.png"></p>');
    expect(xhtml).toContain("<br />");
    expect(xhtml).toContain('<img src="x.png" />');
  });

  it("does not add an extra html/head/body wrapper (fragment mode)", async () => {
    const xhtml = await htmlToXhtmlFragment("<p>just a paragraph</p>");
    expect(xhtml).not.toContain("<html>");
    expect(xhtml).toContain("<p>just a paragraph</p>");
  });
});
