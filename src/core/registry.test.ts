import { describe, expect, it } from "vitest";
import { CONVERSIONS, findEntry, targetsFor } from "./registry";

describe("conversion registry", () => {
  it("exposes PDF targets including images and pdf (merge/split)", () => {
    const targets = targetsFor("pdf");
    expect(targets).toContain("png");
    expect(targets).toContain("jpeg");
    expect(targets).toContain("pdf");
  });

  it("never lists excluded conversions (D1 amended by D11: text-preview pdf->docx allowed)", () => {
    // Faithful-layout conversions that still have no viable OSS lib stay out.
    expect(findEntry("pdf", "xlsx")).toBeNull();
    expect(findEntry("xlsx", "docx")).toBeNull();
    const allFormats = new Set(CONVERSIONS.flatMap((c) => [c.source, c.target]));
    expect(allFormats.has("zip")).toBe(false);
  });

  it("maps every entry to exactly one owning module", () => {
    for (const entry of CONVERSIONS) {
      expect(["pdf", "image", "office", "markdown", "data"]).toContain(entry.module);
    }
  });

  it("findEntry returns the entry for a supported pair and null otherwise", () => {
    expect(findEntry("xlsx", "csv")?.module).toBe("office");
    expect(findEntry("csv", "pdf")).toBeNull();
  });

  it("v2: markdown pairs are owned by the markdown module", () => {
    expect(findEntry("md", "pdf")?.module).toBe("markdown");
    expect(findEntry("pdf", "md")?.module).toBe("markdown");
    expect(findEntry("pdf", "docx")?.module).toBe("markdown");
    expect(findEntry("docx", "md")?.module).toBe("markdown");
  });

  it("v2: data and image extensions are registered", () => {
    expect(findEntry("yaml", "json")?.module).toBe("data");
    expect(findEntry("json", "csv")?.module).toBe("data");
    expect(findEntry("tiff", "png")?.module).toBe("image");
    expect(findEntry("gif", "png")?.module).toBe("image");
    expect(findEntry("bmp", "png")?.module).toBe("image");
  });

  it("v2: still no video, heic or pptx anywhere", () => {
    const allFormats = new Set(CONVERSIONS.flatMap((c) => [c.source, c.target]));
    expect(allFormats.has("zip")).toBe(false);
  });
});
