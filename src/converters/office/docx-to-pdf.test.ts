import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { docxToPdfFile } from "./docx-to-pdf";
import { extractPdfText } from "./pdf-inspect-test-helper";
import { loadFixture } from "./fixtures";
import { ConversionError } from "../../core/types";

describe("docxToPdfFile", () => {
  it("produces a non-empty PDF with extractable text from a real DOCX fixture", async () => {
    const progress: number[] = [];
    const file = await docxToPdfFile(loadFixture("sample.docx"), "sample.docx", (percent) =>
      progress.push(percent),
    );

    expect(file.name).toBe("sample.pdf");
    expect(file.mimeType).toBe("application/pdf");
    expect(file.data.byteLength).toBeGreaterThan(0);

    const doc = await PDFDocument.load(file.data);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);

    const text = extractPdfText(file.data);
    expect(text).toContain("Convertisseur Local Fixture");
    expect(text).toContain("minimal DOCX fixture");
    expect(text).toContain("extractable plain text");

    expect(progress.length).toBeGreaterThan(0);
  });

  it("rejects a password-protected (OLE/CFB) file with a stable error code", async () => {
    const cfb = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
    await expect(docxToPdfFile(cfb.buffer, "protected.docx", () => undefined)).rejects.toMatchObject({
      code: "password-protected",
    } satisfies Partial<ConversionError>);
  });

  it("rejects a non-DOCX/non-zip file as corrupted", async () => {
    const garbage = new Uint8Array([9, 9, 9, 9, 9, 9, 9, 9]);
    await expect(docxToPdfFile(garbage.buffer, "garbage.docx", () => undefined)).rejects.toMatchObject({
      code: "corrupted-file",
    } satisfies Partial<ConversionError>);
  });
});
