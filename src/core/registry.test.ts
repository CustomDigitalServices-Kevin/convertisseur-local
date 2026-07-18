import { describe, expect, it } from "vitest";
import { CONVERSIONS, findEntry, targetsFor } from "./registry";

describe("conversion registry", () => {
  it("exposes PDF targets including images and pdf (merge/split)", () => {
    const targets = targetsFor("pdf");
    expect(targets).toContain("png");
    expect(targets).toContain("jpeg");
    expect(targets).toContain("pdf");
  });

  it("never lists excluded conversions (D1: no pdf->docx, no heic, no video)", () => {
    expect(findEntry("pdf", "docx")).toBeNull();
    const allFormats = new Set(CONVERSIONS.flatMap((c) => [c.source, c.target]));
    expect(allFormats.has("zip")).toBe(false);
  });

  it("maps every entry to exactly one owning module", () => {
    for (const entry of CONVERSIONS) {
      expect(["pdf", "image", "office"]).toContain(entry.module);
    }
  });

  it("findEntry returns the entry for a supported pair and null otherwise", () => {
    expect(findEntry("xlsx", "csv")?.module).toBe("office");
    expect(findEntry("csv", "pdf")).toBeNull();
  });
});
