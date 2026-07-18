import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { imagesToPdf } from "./images-to-pdf";
import type { ConversionOutputFile, ConversionRequest } from "../../core/types";

// The WebP source path (createImageBitmap + OffscreenCanvas) is not
// testable under Vitest/happy-dom -- both are undefined there (verified
// directly). It is covered by the Playwright E2E suite (task 7). PNG and
// JPEG go straight through pdf-lib with no browser-only APIs, so they are
// fully exercised here with real fixture bytes.

function fixture(name: string): ArrayBuffer {
  const bytes = readFileSync(join(process.cwd(), "tests/fixtures", name));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function firstFile(files: ConversionOutputFile[]): ConversionOutputFile {
  const file = files[0];
  if (file === undefined) throw new Error("expected at least one output file");
  return file;
}

function baseRequest(overrides: Partial<ConversionRequest>): ConversionRequest {
  return {
    jobId: "job-1",
    sourceFormat: "png",
    targetFormat: "pdf",
    data: fixture("tiny.png"),
    fileName: "tiny.png",
    options: {},
    ...overrides,
  };
}

describe("imagesToPdf", () => {
  it("wraps a single PNG in a one-page PDF sized to the image", async () => {
    const progress: number[] = [];
    const result = await imagesToPdf(baseRequest({}), (p) => progress.push(p));

    expect(result.fidelity).toBe("high");
    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.name).toBe("tiny.pdf");
    expect(result.files[0]?.mimeType).toBe("application/pdf");

    const doc = await PDFDocument.load(firstFile(result.files).data);
    expect(doc.getPageCount()).toBe(1);
    const page = doc.getPage(0);
    // tiny.png/tiny.jpg/tiny.webp are all 8x8 fixtures (see tests/fixtures README below).
    expect(page.getWidth()).toBe(8);
    expect(page.getHeight()).toBe(8);
    expect(progress.at(-1)).toBe(100);
  });

  it("wraps a single JPEG in a one-page PDF", async () => {
    const result = await imagesToPdf(
      baseRequest({ sourceFormat: "jpeg", data: fixture("tiny.jpg"), fileName: "tiny.jpg" }),
      () => undefined,
    );
    const doc = await PDFDocument.load(firstFile(result.files).data);
    expect(doc.getPageCount()).toBe(1);
  });

  it("combines the primary image and extraInputs into pages in order", async () => {
    const request = baseRequest({
      data: fixture("tiny.png"),
      options: { extraInputs: [fixture("tiny.jpg")] },
    });
    const result = await imagesToPdf(request, () => undefined);
    const doc = await PDFDocument.load(firstFile(result.files).data);
    expect(doc.getPageCount()).toBe(2);
  });

  it("rejects corrupted image bytes with corrupted-file", async () => {
    const garbage = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02]).buffer;
    const request = baseRequest({ data: garbage });
    await expect(imagesToPdf(request, () => undefined)).rejects.toMatchObject({
      code: "corrupted-file",
    });
  });
});
