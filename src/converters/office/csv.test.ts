import { describe, expect, it } from "vitest";
import { detectDelimiter, formatCsvCell, parseCsv, stringifyCsv, stringifyCsvRow } from "./csv";

describe("formatCsvCell", () => {
  it("leaves a plain value untouched", () => {
    expect(formatCsvCell("hello")).toBe("hello");
  });

  it("quotes a value containing the delimiter", () => {
    expect(formatCsvCell("a,b")).toBe('"a,b"');
  });

  it("quotes and escapes embedded double quotes", () => {
    expect(formatCsvCell('he said "hi"')).toBe('"he said ""hi"""');
  });

  it("quotes a value containing a newline", () => {
    expect(formatCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it.each(["=SUM(A1)", "+1+1", "-1", "@cmd", "\ttab", "\rcr", "\nlf"])(
    "neutralizes formula-trigger prefix %j with a leading apostrophe",
    (dangerous) => {
      // CR/LF triggers also force RFC 4180 quoting, which wraps the whole
      // value in an extra leading double quote — strip at most one before
      // asserting the apostrophe guard sits right where the danger was.
      const formatted = formatCsvCell(dangerous).replace(/^"/, "");
      expect(formatted.startsWith("'")).toBe(true);
    },
  );

  it("applies the apostrophe BEFORE RFC 4180 quoting, not after", () => {
    // Cell starts with "=" AND contains a comma: the apostrophe must end up
    // *inside* the quotes, not sit outside them.
    const formatted = formatCsvCell("=SUM(A1),extra");
    expect(formatted).toBe("\"'=SUM(A1),extra\"");
  });

  it("does not neutralize a value that merely contains, but doesn't start with, a trigger char", () => {
    expect(formatCsvCell("total=42")).toBe("total=42");
  });
});

describe("stringifyCsvRow / stringifyCsv", () => {
  it("joins cells with the given delimiter", () => {
    expect(stringifyCsvRow(["a", "b", "c"], ",")).toBe("a,b,c");
    expect(stringifyCsvRow(["a", "b", "c"], ";")).toBe("a;b;c");
  });

  it("joins rows with CRLF and trails a final CRLF", () => {
    expect(stringifyCsv([["a", "b"], ["c", "d"]])).toBe("a,b\r\nc,d\r\n");
  });

  it("returns an empty string for zero rows", () => {
    expect(stringifyCsv([])).toBe("");
  });
});

describe("detectDelimiter", () => {
  it("detects comma-delimited text", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
  });

  it("detects semicolon-delimited text (FR locale)", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
  });

  it("ignores delimiters inside quoted spans on the first line", () => {
    expect(detectDelimiter('"a;b";c;d\n1,2')).toBe(";");
  });

  it("defaults to comma when counts are equal", () => {
    expect(detectDelimiter("a,b;c")).toBe(",");
  });
});

describe("parseCsv", () => {
  it("parses a simple comma CSV", () => {
    const { rows, delimiter } = parseCsv("a,b,c\n1,2,3\n");
    expect(delimiter).toBe(",");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("parses a semicolon CSV", () => {
    const { rows, delimiter } = parseCsv("a;b\n1;2\n");
    expect(delimiter).toBe(";");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles quoted fields with embedded delimiter, quotes and newlines", () => {
    const { rows } = parseCsv('"a,b","he said ""hi""","line1\nline2"\n');
    expect(rows).toEqual([["a,b", 'he said "hi"', "line1\nline2"]]);
  });

  it("handles CRLF, LF and CR line endings", () => {
    expect(parseCsv("a,b\r\nc,d").rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(parseCsv("a,b\nc,d").rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(parseCsv("a,b\rc,d").rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("does not emit a trailing empty row for a trailing newline", () => {
    expect(parseCsv("a,b\n").rows).toEqual([["a", "b"]]);
  });

  it("returns no rows for empty input", () => {
    expect(parseCsv("").rows).toEqual([]);
  });

  it("round-trips through stringifyCsv (values that do not trigger formula neutralization)", () => {
    const original = [
      ["Name", "Amount"],
      ["Alice", "100"],
      ['Quoted, "tricky"', "minus 5"],
    ];
    const csv = stringifyCsv(original);
    const { rows } = parseCsv(csv);
    expect(rows).toEqual(original);
  });

  it("formula-neutralization is an intentionally one-way transform on round-trip", () => {
    const original = [["-5"]];
    const csv = stringifyCsv(original);
    const { rows } = parseCsv(csv);
    expect(rows).toEqual([["'-5"]]);
  });
});
