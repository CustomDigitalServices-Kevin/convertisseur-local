import { describe, expect, it } from "vitest";
import { xlsxToCsvFiles, xlsxToJsonFiles, xlsxToHtmlFiles } from "./xlsx-to-tabular";
import { loadFixture } from "./fixtures";
import { expectDefined } from "./test-assert";

const FIXTURE_NAME = "sample-multisheet.xlsx";

function decode(file: { data: ArrayBuffer }): string {
  return new TextDecoder("utf-8").decode(file.data);
}

describe("xlsxToCsvFiles", () => {
  it("produces one CSV file per sheet, named after the sheet", async () => {
    const files = await xlsxToCsvFiles(loadFixture(FIXTURE_NAME), "sample-multisheet.xlsx");
    expect(files.map((f) => f.name)).toEqual([
      "sample-multisheet-Data.csv",
      "sample-multisheet-Notes.csv",
    ]);
    for (const file of files) expect(file.mimeType).toBe("text/csv");
  });

  it("emits correct header and data rows for the Data sheet", async () => {
    const files = await xlsxToCsvFiles(loadFixture(FIXTURE_NAME), "sample-multisheet.xlsx");
    const csv = decode(expectDefined(files[0], "Data CSV file"));
    const lines = csv.split("\r\n").filter((line) => line.length > 0);
    expect(lines[0]).toBe("Name,Amount,Active,Created");
    expect(lines[1]).toBe("Alice,100,TRUE,2026-01-15T00:00:00.000Z");
    expect(lines[2]).toBe("Bob,200.5,FALSE,2026-02-01T00:00:00.000Z");
  });

  it("neutralizes a formula cell with no cached result (=SUM(...)) in CSV output", async () => {
    const files = await xlsxToCsvFiles(loadFixture(FIXTURE_NAME), "sample-multisheet.xlsx");
    const csv = decode(expectDefined(files[0], "Data CSV file"));
    const lines = csv.split("\r\n").filter((line) => line.length > 0);
    const totalLine = lines.find((line) => line.startsWith("Total,"));
    expect(totalLine).toBeDefined();
    // The formula cell's display text is "=SUM(B2:B3)" (no comma, no
    // embedded quote, so RFC 4180 quoting does not kick in) — CSV
    // injection neutralization must still prefix it with an apostrophe.
    const expectedField = String.fromCharCode(39) + "=SUM(B2:B3)";
    expect(totalLine).toBe(`Total,${expectedField},,`);
  });

  it("neutralizes a plain-text cell that merely looks like a formula", async () => {
    const files = await xlsxToCsvFiles(loadFixture(FIXTURE_NAME), "sample-multisheet.xlsx");
    const csv = decode(expectDefined(files[0], "Data CSV file"));
    const lines = csv.split("\r\n").filter((line) => line.length > 0);
    const hyperlinkLine = lines.find((line) => line.includes("HYPERLINK"));
    expect(hyperlinkLine).toBeDefined();
    // The source text itself contains embedded double quotes
    // (=HYPERLINK("...")), so RFC 4180 quoting wraps the whole field and
    // doubles the embedded quotes, in addition to the apostrophe guard.
    const quote = String.fromCharCode(34);
    const apostrophe = String.fromCharCode(39);
    const expectedField =
      quote + apostrophe + "=HYPERLINK(" + quote + quote + "http://evil.example" + quote + quote + ")" + quote;
    expect(hyperlinkLine).toBe(`${expectedField},0,TRUE,`);
  });

  it("quotes a cell containing a comma from the Notes sheet", async () => {
    const files = await xlsxToCsvFiles(loadFixture(FIXTURE_NAME), "sample-multisheet.xlsx");
    const csv = decode(expectDefined(files[1], "Notes CSV file"));
    const quote = String.fromCharCode(34);
    expect(csv).toContain(`${quote}A ${quote}${quote}quoted, tricky${quote}${quote} value, with a comma${quote}`);
  });
});

describe("xlsxToJsonFiles", () => {
  it("produces one JSON file per sheet with header-keyed records", async () => {
    const files = await xlsxToJsonFiles(loadFixture(FIXTURE_NAME), "sample-multisheet.xlsx");
    expect(files.map((f) => f.name)).toEqual([
      "sample-multisheet-Data.json",
      "sample-multisheet-Notes.json",
    ]);
    const records = JSON.parse(decode(expectDefined(files[0], "Data JSON file"))) as Array<
      Record<string, string>
    >;
    expect(records[0]).toEqual({
      Name: "Alice",
      Amount: "100",
      Active: "TRUE",
      Created: "2026-01-15T00:00:00.000Z",
    });
    expect(records[1]).toEqual({
      Name: "Bob",
      Amount: "200.5",
      Active: "FALSE",
      Created: "2026-02-01T00:00:00.000Z",
    });
  });
});

describe("xlsxToHtmlFiles", () => {
  it("produces one HTML file per sheet with an escaped table", async () => {
    const files = await xlsxToHtmlFiles(loadFixture(FIXTURE_NAME), "sample-multisheet.xlsx");
    expect(files.map((f) => f.name)).toEqual([
      "sample-multisheet-Data.html",
      "sample-multisheet-Notes.html",
    ]);
    const html = decode(expectDefined(files[0], "Data HTML file"));
    expect(html).toContain("<table>");
    expect(html).toContain("<td>Alice</td>");
  });

  it("HTML-escapes special characters in cell content", async () => {
    const files = await xlsxToHtmlFiles(loadFixture(FIXTURE_NAME), "sample-multisheet.xlsx");
    const notesHtml = decode(expectDefined(files[1], "Notes HTML file"));
    expect(notesHtml).toContain("&quot;quoted, tricky&quot;");
  });
});
