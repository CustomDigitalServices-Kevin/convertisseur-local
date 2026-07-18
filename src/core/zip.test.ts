import { describe, expect, it } from "vitest";
import { unzipSync } from "fflate";
import { createZip } from "./zip";
import type { ConversionOutputFile } from "./types";

function outputFile(name: string, content: string): ConversionOutputFile {
  return { name, mimeType: "text/plain", data: new TextEncoder().encode(content).buffer };
}

describe("createZip", () => {
  it("produces a zip whose entries round-trip back to the original bytes", () => {
    const zip = createZip([outputFile("a.txt", "hello"), outputFile("b.txt", "world")]);
    const entries = unzipSync(new Uint8Array(zip));
    expect(Object.keys(entries).sort()).toEqual(["a.txt", "b.txt"]);
    expect(new TextDecoder().decode(entries["a.txt"])).toBe("hello");
    expect(new TextDecoder().decode(entries["b.txt"])).toBe("world");
  });

  it("deduplicates colliding entry names", () => {
    const zip = createZip([
      outputFile("page.png", "one"),
      outputFile("page.png", "two"),
      outputFile("page.png", "three"),
    ]);
    const names = Object.keys(unzipSync(new Uint8Array(zip))).sort();
    expect(names).toEqual(["page (1).png", "page (2).png", "page.png"]);
  });
});
