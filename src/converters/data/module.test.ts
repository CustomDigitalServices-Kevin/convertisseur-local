import { describe, expect, it } from "vitest";
import type { ConversionRequest } from "../../core/types";
import { ConversionError } from "../../core/types";
import { dataModule } from "./module";

function textData(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

function baseRequest(overrides: Partial<ConversionRequest>): ConversionRequest {
  return {
    jobId: "job-1",
    sourceFormat: "yaml",
    targetFormat: "json",
    data: textData("a: 1\n"),
    fileName: "input.yaml",
    options: {},
    ...overrides,
  };
}

describe("dataModule.convert", () => {
  it("yaml -> json is fidelity 'high' and names the output file input.json", async () => {
    const result = await dataModule.convert(baseRequest({}), () => undefined);
    expect(result.fidelity).toBe("high");
    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.name).toBe("input.json");
    expect(result.files[0]?.mimeType).toBe("application/json");
  });

  it("json -> yaml", async () => {
    const result = await dataModule.convert(
      baseRequest({
        sourceFormat: "json",
        targetFormat: "yaml",
        data: textData('{"a":1}'),
        fileName: "input.json",
      }),
      () => undefined,
    );
    expect(result.files[0]?.name).toBe("input.yaml");
  });

  it("xml -> json", async () => {
    const result = await dataModule.convert(
      baseRequest({
        sourceFormat: "xml",
        targetFormat: "json",
        data: textData("<root>1</root>"),
        fileName: "input.xml",
      }),
      () => undefined,
    );
    expect(result.files[0]?.name).toBe("input.json");
  });

  it("json -> xml", async () => {
    const result = await dataModule.convert(
      baseRequest({
        sourceFormat: "json",
        targetFormat: "xml",
        data: textData('{"root":"1"}'),
        fileName: "input.json",
      }),
      () => undefined,
    );
    expect(result.files[0]?.name).toBe("input.xml");
  });

  it("json -> csv", async () => {
    const result = await dataModule.convert(
      baseRequest({
        sourceFormat: "json",
        targetFormat: "csv",
        data: textData('[{"a":1}]'),
        fileName: "input.json",
      }),
      () => undefined,
    );
    expect(result.files[0]?.name).toBe("input.csv");
  });

  it("csv -> json", async () => {
    const result = await dataModule.convert(
      baseRequest({
        sourceFormat: "csv",
        targetFormat: "json",
        data: textData("a\r\n1\r\n"),
        fileName: "input.csv",
      }),
      () => undefined,
    );
    expect(result.files[0]?.name).toBe("input.json");
  });

  it("calls reportProgress and finishes at 100", async () => {
    const progress: number[] = [];
    await dataModule.convert(baseRequest({}), (percent) => progress.push(percent));
    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]).toBe(100);
  });

  it("throws unsupported-conversion for a pair the data module does not own", async () => {
    await expect(
      dataModule.convert(baseRequest({ sourceFormat: "pdf", targetFormat: "png" }), () => undefined),
    ).rejects.toMatchObject({ code: "unsupported-conversion" } satisfies Partial<ConversionError>);
  });
});
