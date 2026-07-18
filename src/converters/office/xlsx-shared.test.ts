import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { ConversionError } from "../../core/types";
import { cellDisplayText, loadWorkbook, sheetToRows, writeWorkbookToArrayBuffer } from "./xlsx-shared";

describe("cellDisplayText", () => {
  it("renders null/undefined as an empty string", () => {
    expect(cellDisplayText(null)).toBe("");
    expect(cellDisplayText(undefined)).toBe("");
  });

  it("renders strings, numbers and booleans", () => {
    expect(cellDisplayText("hello")).toBe("hello");
    expect(cellDisplayText(42)).toBe("42");
    expect(cellDisplayText(true)).toBe("TRUE");
    expect(cellDisplayText(false)).toBe("FALSE");
  });

  it("renders a Date as ISO 8601", () => {
    const date = new Date(Date.UTC(2026, 0, 15, 12, 30));
    expect(cellDisplayText(date)).toBe(date.toISOString());
  });

  it("renders an error value", () => {
    expect(cellDisplayText({ error: "#DIV/0!" })).toBe("#DIV/0!");
  });

  it("renders rich text by concatenating runs", () => {
    expect(
      cellDisplayText({
        richText: [
          { text: "Hello, " },
          { text: "world", font: { bold: true } },
        ],
      }),
    ).toBe("Hello, world");
  });

  it("renders a hyperlink value using its display text", () => {
    expect(cellDisplayText({ text: "Example", hyperlink: "https://example.com" })).toBe("Example");
  });

  it("renders a formula's cached result when present", () => {
    expect(cellDisplayText({ formula: "SUM(A1:A2)", result: 42 })).toBe("42");
  });

  it("renders a formula's cached Date result as ISO 8601", () => {
    const date = new Date(Date.UTC(2026, 5, 1));
    expect(cellDisplayText({ formula: "TODAY()", result: date })).toBe(date.toISOString());
  });

  it("renders a formula's cached error result", () => {
    expect(cellDisplayText({ formula: "1/0", result: { error: "#DIV/0!" } })).toBe("#DIV/0!");
  });

  it("falls back to '=formula' when no cached result is present", () => {
    expect(cellDisplayText({ formula: "SUM(A1)" })).toBe("=SUM(A1)");
  });

  it("falls back to '=sharedFormula' when no cached result is present", () => {
    expect(cellDisplayText({ sharedFormula: "SUM($A$1:$A$10)" })).toBe("=SUM($A$1:$A$10)");
  });
});

describe("loadWorkbook", () => {
  it("rejects a file that looks like a password-protected (OLE/CFB) document", async () => {
    const cfb = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
    await expect(loadWorkbook(cfb.buffer)).rejects.toMatchObject({
      code: "password-protected",
    } satisfies Partial<ConversionError>);
  });

  it("rejects garbage bytes as a corrupted file", async () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(loadWorkbook(garbage.buffer)).rejects.toMatchObject({
      code: "corrupted-file",
    } satisfies Partial<ConversionError>);
  });

  it("loads a real workbook written by ExcelJS", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow(["a", "b"]);
    const buffer = await writeWorkbookToArrayBuffer(workbook);

    const loaded = await loadWorkbook(buffer);
    expect(loaded.worksheets.map((w) => w.name)).toEqual(["Sheet1"]);
  });
});

describe("sheetToRows", () => {
  it("pads every row to the sheet's declared column count", () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow(["a", "b", "c"]);
    sheet.addRow(["1"]);

    const rows = sheetToRows(sheet);
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "", ""],
    ]);
  });
});
