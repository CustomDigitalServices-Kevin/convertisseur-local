import { describe, expect, it } from "vitest";
import { markdownModule } from "./module";
import { CONVERSIONS } from "../../core/registry";
import type { ConversionRequest, FileFormat } from "../../core/types";
import { ConversionError } from "../../core/types";
import { loadFixture } from "./fixtures";

function request(source: FileFormat, target: FileFormat, data: ArrayBuffer, fileName: string): ConversionRequest {
  return { jobId: "job-1", sourceFormat: source, targetFormat: target, data, fileName, options: {} };
}

describe("markdownModule", () => {
  it("converts md -> html and reports 100% progress at the end", async () => {
    const progress: number[] = [];
    const result = await markdownModule.convert(
      request("md", "html", loadFixture("markdown-rich.md"), "markdown-rich.md"),
      (p) => progress.push(p),
    );
    expect(result.fidelity).toBe("high");
    expect(result.files).toHaveLength(1);
    expect(progress.at(-1)).toBe(100);
  });

  it("converts docx -> md with preview fidelity", async () => {
    const result = await markdownModule.convert(
      request("docx", "md", loadFixture("sample.docx"), "sample.docx"),
      () => undefined,
    );
    expect(result.fidelity).toBe("preview");
    expect(result.files[0]?.name).toBe("sample.md");
  });

  it("converts md -> epub with medium fidelity", async () => {
    const result = await markdownModule.convert(
      request("md", "epub", loadFixture("markdown-rich.md"), "markdown-rich.md"),
      () => undefined,
    );
    expect(result.fidelity).toBe("medium");
    expect(result.files[0]?.mimeType).toBe("application/epub+zip");
  });

  it("rejects an unsupported pair with a stable error code", async () => {
    await expect(
      markdownModule.convert(request("md", "json", new ArrayBuffer(0), "x.md"), () => undefined),
    ).rejects.toMatchObject({ code: "unsupported-conversion" } satisfies Partial<ConversionError>);
  });

  it("handles every non-PDF, non-DOCX markdown-owned pair from the core registry without throwing unsupported-conversion", async () => {
    // PDF sources need a real PDF loader (see pdf-outputs.test.ts for why
    // that cannot run under Vitest). DOCX sources need a real zip fixture,
    // not the trivial text buffer used here for every other pair; that path
    // is already covered by "converts docx -> md" above and by
    // html-to-markdown.test.ts. This leaves dispatch coverage for md/html/txt
    // sources, proving each pair resolves to a real converter instead of
    // falling through to "unsupported-conversion".
    const markdownPairs = CONVERSIONS.filter(
      (entry) => entry.module === "markdown" && entry.source !== "pdf" && entry.source !== "docx",
    );
    expect(markdownPairs.length).toBeGreaterThan(0);

    for (const pair of markdownPairs) {
      const data = new TextEncoder().encode("# T\n\nHello.").buffer;
      const promise = markdownModule.convert(
        request(pair.source, pair.target, data, `x.${pair.source}`),
        () => undefined,
      );
      await expect(promise).resolves.toBeDefined();
    }
  });
});
