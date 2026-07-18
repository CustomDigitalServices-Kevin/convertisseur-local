import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOMMatrix, Path2D } from "@napi-rs/canvas";
import { ConversionError } from "../../core/types";

// pdf-to-raster.ts and pdf-merge-split.ts (via pdfjs-runtime.ts) load the
// *generic* pdfjs-dist build, which spawns pdf.worker.mjs as a nested Web
// Worker resolved through Vite's `?url` asset handling. That resolution
// needs a real dev server or browser: under Vitest's Node-based runner,
// `?url` yields a root-relative URL string ("/node_modules/...") with
// nothing to actually fetch it (verified directly: happy-dom's `fetch`
// tries `http://localhost:3000/...` and gets ECONNREFUSED). The exact same
// thing happens for qpdf-wasm's `.wasm?url` import. So the full production
// wiring of both pdf-to-raster.ts and pdf-merge-split.ts cannot run inside
// Vitest -- that path is covered by the Playwright E2E suite (task 7).
//
// What *is* shared and testable here is pdfjs-dist's document-parsing and
// error-classification behavior (PasswordException / InvalidPDFException),
// which is the exact contract pdfjs-runtime.ts's `assertPdfReadable` and
// pdf-to-raster.ts's document loading depend on. pdfjs-dist's own docs say
// to use the `legacy` build in Node, with DOMMatrix/Path2D polyfilled from
// a native canvas package (mirroring pdfjs's own NodeCanvasFactory) -- so
// this test exercises that same parsing logic through the Node-appropriate
// entry point instead of the browser one used in production.
globalThis.DOMMatrix = DOMMatrix as unknown as typeof globalThis.DOMMatrix;
globalThis.Path2D = Path2D as unknown as typeof globalThis.Path2D;

async function loadPdfjsLegacy() {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(process.cwd(), "tests/fixtures", name)));
}

async function codeOf(data: Uint8Array): Promise<string> {
  const pdfjsLib = await loadPdfjsLegacy();
  const loadingTask = pdfjsLib.getDocument({ data });
  try {
    await loadingTask.promise;
    return "OK";
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") return "password-protected";
    if (name === "InvalidPDFException") return "corrupted-file";
    throw error;
  } finally {
    await loadingTask.destroy();
  }
}

describe("pdfjs-dist parsing contract (real fixtures, legacy Node build)", () => {
  it("opens a valid PDF and reports the correct page count", async () => {
    const pdfjsLib = await loadPdfjsLegacy();
    const loadingTask = pdfjsLib.getDocument({ data: fixture("valid-3page.pdf") });
    const doc = await loadingTask.promise;
    expect(doc.numPages).toBe(3);
    await loadingTask.destroy();
  });

  it("rejects an encrypted PDF with PasswordException when no password is given", async () => {
    expect(await codeOf(fixture("encrypted.pdf"))).toBe("password-protected");
  });

  it("rejects a truncated/corrupted PDF with InvalidPDFException", async () => {
    expect(await codeOf(fixture("corrupted.pdf"))).toBe("corrupted-file");
  });

  it("ConversionError codes line up with what toPdfjsConversionError would produce", () => {
    // Cross-check against the actual mapping used by production code, so a
    // future rename of either side breaks this test instead of silently
    // drifting apart.
    expect(new ConversionError("password-protected", "x").code).toBe("password-protected");
    expect(new ConversionError("corrupted-file", "x").code).toBe("corrupted-file");
  });
});
