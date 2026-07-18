import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { csvToXlsxFiles } from "./csv-to-xlsx";
import { expectDefined } from "./test-assert";

describe("csvToXlsxFiles", () => {
  it("converts a comma CSV into a readable XLSX workbook", async () => {
    const csv = "Name,Amount\r\nAlice,100\r\nBob,200\r\n";
    const files = await csvToXlsxFiles(new TextEncoder().encode(csv).buffer, "data.csv");
    const file = expectDefined(files[0], "xlsx file");
    expect(file.name).toBe("data.xlsx");
    expect(file.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.data);
    const sheet = expectDefined(workbook.worksheets[0], "worksheet");
    expect(sheet.getRow(1).values).toEqual([undefined, "Name", "Amount"]);
    expect(sheet.getRow(2).values).toEqual([undefined, "Alice", "100"]);
    expect(sheet.getRow(3).values).toEqual([undefined, "Bob", "200"]);
  });

  it("auto-detects a semicolon-delimited (FR locale) CSV", async () => {
    const csv = "Nom;Montant\r\nAlice;100\r\n";
    const files = await csvToXlsxFiles(new TextEncoder().encode(csv).buffer, "data-fr.csv");
    const file = expectDefined(files[0], "xlsx file");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.data);
    const sheet = expectDefined(workbook.worksheets[0], "worksheet");
    expect(sheet.getRow(1).values).toEqual([undefined, "Nom", "Montant"]);
    expect(sheet.getRow(2).values).toEqual([undefined, "Alice", "100"]);
  });

  it("preserves quoted fields containing the delimiter", async () => {
    const csv = 'Name,Note\r\nAlice,"a, tricky value"\r\n';
    const files = await csvToXlsxFiles(new TextEncoder().encode(csv).buffer, "data.csv");
    const file = expectDefined(files[0], "xlsx file");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.data);
    const sheet = expectDefined(workbook.worksheets[0], "worksheet");
    expect(sheet.getRow(2).values).toEqual([undefined, "Alice", "a, tricky value"]);
  });
});
