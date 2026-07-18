import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { xlsxToPdfFile } from "./xlsx-to-pdf";
import { extractPdfText } from "./pdf-inspect-test-helper";
import { loadFixture } from "./fixtures";

describe("xlsxToPdfFile", () => {
  it("produces a non-empty PDF containing text from every sheet", async () => {
    const progress: number[] = [];
    const file = await xlsxToPdfFile(
      loadFixture("sample-multisheet.xlsx"),
      "sample-multisheet.xlsx",
      (percent) => progress.push(percent),
    );

    expect(file.name).toBe("sample-multisheet.pdf");
    expect(file.mimeType).toBe("application/pdf");
    expect(file.data.byteLength).toBeGreaterThan(0);

    const doc = await PDFDocument.load(file.data);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);

    const text = extractPdfText(file.data);
    expect(text).toContain("Data");
    expect(text).toContain("Alice");
    expect(text).toContain("Notes");

    expect(progress.length).toBeGreaterThan(0);
  });

  it("reports monotonically non-decreasing progress", async () => {
    const progress: number[] = [];
    await xlsxToPdfFile(loadFixture("sample-multisheet.xlsx"), "sample-multisheet.xlsx", (p) =>
      progress.push(p),
    );
    for (let i = 1; i < progress.length; i += 1) {
      expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1] ?? 0);
    }
  });
});
