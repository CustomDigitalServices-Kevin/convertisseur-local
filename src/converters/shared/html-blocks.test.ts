import { describe, expect, it } from "vitest";
import { parseHtmlBlocks } from "./html-blocks";

describe("parseHtmlBlocks", () => {
  it("parses headings h1 through h6 with their level", () => {
    const html = "<h1>One</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4><h5>Five</h5><h6>Six</h6>";
    expect(parseHtmlBlocks(html)).toEqual([
      { kind: "heading", level: 1, text: "One" },
      { kind: "heading", level: 2, text: "Two" },
      { kind: "heading", level: 3, text: "Three" },
      { kind: "heading", level: 4, text: "Four" },
      { kind: "heading", level: 5, text: "Five" },
      { kind: "heading", level: 6, text: "Six" },
    ]);
  });

  it("parses paragraphs", () => {
    expect(parseHtmlBlocks("<p>Hello world</p>")).toEqual([
      { kind: "paragraph", text: "Hello world" },
    ]);
  });

  it("strips inline formatting tags but keeps their text", () => {
    expect(parseHtmlBlocks("<p>Hello <strong>bold</strong> and <em>italic</em> text</p>")).toEqual([
      { kind: "paragraph", text: "Hello bold and italic text" },
    ]);
  });

  it("decodes named and numeric HTML entities", () => {
    expect(parseHtmlBlocks("<p>Tom &amp; Jerry &lt;3 &#233;t&#x00e9;</p>")).toEqual([
      { kind: "paragraph", text: "Tom & Jerry <3 été" },
    ]);
  });

  it("collapses internal whitespace", () => {
    expect(parseHtmlBlocks("<p>Line one\n   with   extra   spaces</p>")).toEqual([
      { kind: "paragraph", text: "Line one with extra spaces" },
    ]);
  });

  it("parses list items", () => {
    expect(parseHtmlBlocks("<ul><li>First</li><li>Second</li></ul>")).toEqual([
      { kind: "listItem", text: "First" },
      { kind: "listItem", text: "Second" },
    ]);
  });

  it("parses a table into a grid of cell text, from both td and th", () => {
    const html = "<table><tr><th>Name</th><th>Amount</th></tr><tr><td>Alice</td><td>100</td></tr></table>";
    expect(parseHtmlBlocks(html)).toEqual([
      { kind: "table", rows: [["Name", "Amount"], ["Alice", "100"]] },
    ]);
  });

  it("preserves document order across mixed block types", () => {
    const html = "<h1>Title</h1><p>Intro</p><table><tr><td>x</td></tr></table><p>Outro</p>";
    const blocks = parseHtmlBlocks(html);
    expect(blocks.map((b) => b.kind)).toEqual(["heading", "paragraph", "table", "paragraph"]);
  });

  it("strips script and style blocks entirely", () => {
    const html = "<style>p{color:red}</style><p>Visible</p><script>alert(1)</script>";
    expect(parseHtmlBlocks(html)).toEqual([{ kind: "paragraph", text: "Visible" }]);
  });

  it("skips empty headings, paragraphs and list items", () => {
    expect(parseHtmlBlocks("<h1></h1><p>   </p><li></li>")).toEqual([]);
  });

  it("returns an empty array for text with no recognized block tags", () => {
    expect(parseHtmlBlocks("just plain text, no tags")).toEqual([]);
  });
});
