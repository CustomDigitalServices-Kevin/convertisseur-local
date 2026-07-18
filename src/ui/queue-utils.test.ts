import { describe, expect, it } from "vitest";
import {
  buildQueueItem,
  intersect,
  isConversionFailure,
  isFileFormat,
  withoutExtension,
} from "./queue-utils";

function pdfFile(name = "doc.pdf"): File {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
  return new File([bytes], name, { type: "application/pdf" });
}

describe("withoutExtension", () => {
  it("strips the last extension", () => {
    expect(withoutExtension("report.final.pdf")).toBe("report.final");
  });

  it("returns the name unchanged when there is no dot", () => {
    expect(withoutExtension("README")).toBe("README");
  });
});

describe("isFileFormat", () => {
  it("accepts every known format", () => {
    expect(isFileFormat("pdf")).toBe(true);
    expect(isFileFormat("xlsx")).toBe(true);
  });

  it("rejects unknown strings", () => {
    expect(isFileFormat("")).toBe(false);
    expect(isFileFormat("heic")).toBe(false);
  });
});

describe("isConversionFailure", () => {
  it("accepts a well-formed failure payload", () => {
    expect(isConversionFailure({ jobId: "1", code: "corrupted-file", detail: "bad" })).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isConversionFailure(null)).toBe(false);
    expect(isConversionFailure("cancelled")).toBe(false);
    expect(isConversionFailure({ jobId: "1" })).toBe(false);
  });
});

describe("intersect", () => {
  it("returns formats common to every list", () => {
    expect(intersect([["png", "jpeg", "webp"], ["jpeg", "webp", "avif"]])).toEqual([
      "jpeg",
      "webp",
    ]);
  });

  it("returns an empty array when given no lists", () => {
    expect(intersect([])).toEqual([]);
  });

  it("returns an empty array when a list has nothing in common", () => {
    expect(intersect([["png"], ["xlsx"]])).toEqual([]);
  });
});

describe("buildQueueItem", () => {
  it("detects a recognized format and lists its targets", async () => {
    const item = await buildQueueItem(pdfFile());
    expect(item.sourceFormat).toBe("pdf");
    expect(item.availableTargets).toContain("png");
    expect(item.status).toBe("idle");
    expect(item.localError).toBeNull();
  });

  it("flags unrecognized content as a local error", async () => {
    const file = new File([new Uint8Array([0x00, 0x01, 0x02])], "mystery.bin");
    const item = await buildQueueItem(file);
    expect(item.sourceFormat).toBeNull();
    expect(item.status).toBe("error");
    expect(item.localError).toBe("unrecognized-format");
  });

  it("flags a recognized format with no possible target", async () => {
    const file = new File([new TextEncoder().encode('{"a":1}')], "data.json", {
      type: "application/json",
    });
    const item = await buildQueueItem(file);
    expect(item.sourceFormat).toBe("json");
    expect(item.availableTargets).toEqual([]);
    expect(item.status).toBe("error");
    expect(item.localError).toBe("no-target");
  });

  it("assigns a unique id to every item", async () => {
    const [a, b] = await Promise.all([pdfFile("a.pdf"), pdfFile("b.pdf")].map(buildQueueItem));
    if (a === undefined || b === undefined) throw new Error("expected two items");
    expect(a.id).not.toBe(b.id);
  });
});
