import { describe, expect, it } from "vitest";
import { officeModule } from "./module";
import { loadFixture } from "./fixtures";
import { ConversionError } from "../../core/types";
import type { ConversionRequest } from "../../core/types";

function baseRequest(overrides: Partial<ConversionRequest>): ConversionRequest {
  return {
    jobId: "job-1",
    sourceFormat: "xlsx",
    targetFormat: "csv",
    data: loadFixture("sample-multisheet.xlsx"),
    fileName: "sample-multisheet.xlsx",
    options: {},
    ...overrides,
  };
}

describe("officeModule.convert", () => {
  it("xlsx -> csv is fidelity 'high'", async () => {
    const result = await officeModule.convert(baseRequest({}), () => undefined);
    expect(result.fidelity).toBe("high");
    expect(result.files.length).toBeGreaterThan(0);
  });

  it("xlsx -> json is fidelity 'high'", async () => {
    const result = await officeModule.convert(
      baseRequest({ targetFormat: "json" }),
      () => undefined,
    );
    expect(result.fidelity).toBe("high");
  });

  it("xlsx -> html is fidelity 'high'", async () => {
    const result = await officeModule.convert(
      baseRequest({ targetFormat: "html" }),
      () => undefined,
    );
    expect(result.fidelity).toBe("high");
  });

  it("xlsx -> pdf is fidelity 'medium'", async () => {
    const result = await officeModule.convert(
      baseRequest({ targetFormat: "pdf" }),
      () => undefined,
    );
    expect(result.fidelity).toBe("medium");
    expect(result.files).toHaveLength(1);
  });

  it("csv -> xlsx is fidelity 'high'", async () => {
    const csv = new TextEncoder().encode("a,b\n1,2\n").buffer;
    const result = await officeModule.convert(
      baseRequest({ sourceFormat: "csv", targetFormat: "xlsx", data: csv, fileName: "data.csv" }),
      () => undefined,
    );
    expect(result.fidelity).toBe("high");
  });

  it("docx -> pdf is fidelity 'preview'", async () => {
    const result = await officeModule.convert(
      baseRequest({
        sourceFormat: "docx",
        targetFormat: "pdf",
        data: loadFixture("sample.docx"),
        fileName: "sample.docx",
      }),
      () => undefined,
    );
    expect(result.fidelity).toBe("preview");
    expect(result.files).toHaveLength(1);
  });

  it("calls reportProgress at least once and finishes at 100", async () => {
    const progress: number[] = [];
    await officeModule.convert(baseRequest({}), (percent) => progress.push(percent));
    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]).toBe(100);
  });

  it("throws unsupported-conversion for a pair the office module does not own", async () => {
    await expect(
      officeModule.convert(
        baseRequest({ sourceFormat: "png", targetFormat: "pdf" }),
        () => undefined,
      ),
    ).rejects.toMatchObject({ code: "unsupported-conversion" } satisfies Partial<ConversionError>);
  });
});
