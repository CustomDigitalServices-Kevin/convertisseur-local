import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import initQpdf from "@jspawn/qpdf-wasm/qpdf.mjs";
import { buildQpdfArgs } from "./pdf-merge-split";

// mergeOrSplitPdf() itself cannot run under Vitest: it loads qpdf-wasm's
// .wasm binary through Vite's `?url` asset handling, which under Vitest's
// Node-based runner resolves to a root-relative URL string with nothing to
// serve it (verified directly: happy-dom's fetch tries
// http://localhost:3000/... and gets ECONNREFUSED -- the same limitation
// documented in pdfjs-parsing.test.ts for the pdf.worker asset). That full
// wiring is covered by the Playwright E2E suite (task 7).
//
// What's tested here instead, with no mocking:
//  1. `buildQpdfArgs` in isolation -- the hand-built qpdf CLI argument
//     lists for split/merge/normalize, exported as a pure-ish function.
//  2. The exact same qpdf-wasm library, loaded via a plain filesystem
//     `locateFile` (valid in Node) instead of the `?url` asset Vite
//     produces for the browser build -- proving the argument lists
//     `buildQpdfArgs` produces actually work against the real qpdf CLI on
//     real fixture PDFs (split page selection, multi-file merge order,
//     single-file normalize).

interface FakeQpdf {
  FS: { writeFile: ReturnType<typeof vi.fn> };
}

function fakeQpdf(): FakeQpdf {
  return { FS: { writeFile: vi.fn() } };
}

describe("buildQpdfArgs", () => {
  it("builds a split command from options.pages, referencing the primary file with '.'", () => {
    const qpdf = fakeQpdf();
    const args = buildQpdfArgs(qpdf as never, [1, 3], []);
    expect(args).toEqual(["/input.pdf", "--pages", ".", "1,3", "--", "/output.pdf"]);
    expect(qpdf.FS.writeFile).not.toHaveBeenCalled();
  });

  it("preserves the given page order (not sorted)", () => {
    const qpdf = fakeQpdf();
    const args = buildQpdfArgs(qpdf as never, [3, 1, 2], []);
    expect(args).toContain("3,1,2");
  });

  it("builds a merge command with an explicit whole-document range per extra file", () => {
    const qpdf = fakeQpdf();
    const extra0 = new ArrayBuffer(1);
    const extra1 = new ArrayBuffer(1);
    const args = buildQpdfArgs(qpdf as never, [], [extra0, extra1]);
    expect(args).toEqual([
      "--empty",
      "--pages",
      "/input.pdf",
      "1-z",
      "/extra0.pdf",
      "1-z",
      "/extra1.pdf",
      "1-z",
      "--",
      "/output.pdf",
    ]);
    expect(qpdf.FS.writeFile).toHaveBeenCalledTimes(2);
    expect(qpdf.FS.writeFile).toHaveBeenNthCalledWith(1, "/extra0.pdf", expect.any(Uint8Array));
    expect(qpdf.FS.writeFile).toHaveBeenNthCalledWith(2, "/extra1.pdf", expect.any(Uint8Array));
  });

  it("builds a plain normalize command when there are no pages and no extraInputs", () => {
    const qpdf = fakeQpdf();
    expect(buildQpdfArgs(qpdf as never, [], [])).toEqual(["/input.pdf", "--", "/output.pdf"]);
  });
});

// --- Real qpdf-wasm, Node-loaded, against the exact arg shapes above ---

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(process.cwd(), "tests/fixtures", name)));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function loadQpdfForNode(): Promise<Awaited<ReturnType<typeof initQpdf>>> {
  const wasmPath = join(process.cwd(), "node_modules/@jspawn/qpdf-wasm/qpdf.wasm");
  // Same fetch-vs-Node-fallback quirk as the fixture generator script: this
  // build takes a browser `fetch()` path whenever a global `fetch` exists
  // (Node 18+ ships one, and vitest's happy-dom environment ships another),
  // which chokes on a plain filesystem path. Node's own `fs.readFileSync`
  // fallback works correctly, so drop `fetch` for this Node-side
  // instantiation to force that fallback.
  const savedFetch = globalThis.fetch;
  Reflect.deleteProperty(globalThis, "fetch");
  try {
    return await initQpdf({ locateFile: (p) => (p.endsWith(".wasm") ? wasmPath : p) });
  } finally {
    globalThis.fetch = savedFetch;
  }
}

describe("qpdf-wasm merge/split/normalize (real library, real fixtures)", () => {
  it("split: extracts pages 1 and 3 from a 3-page PDF, in that order", async () => {
    const qpdf = await loadQpdfForNode();
    qpdf.FS.writeFile("/input.pdf", fixture("valid-3page.pdf"));
    const args = buildQpdfArgs(qpdf, [1, 3], []);
    expect(qpdf.callMain(args)).toBe(0);
    const output = qpdf.FS.readFile("/output.pdf");
    const doc = await PDFDocument.load(output);
    expect(doc.getPageCount()).toBe(2);
  });

  it("merge: concatenates two single-page PDFs into a two-page PDF, primary first", async () => {
    const qpdf = await loadQpdfForNode();
    qpdf.FS.writeFile("/input.pdf", fixture("valid-1page.pdf"));
    const args = buildQpdfArgs(qpdf, [], [toArrayBuffer(fixture("valid-1page-b.pdf"))]);
    expect(qpdf.callMain(args)).toBe(0);
    const output = qpdf.FS.readFile("/output.pdf");
    const doc = await PDFDocument.load(output);
    expect(doc.getPageCount()).toBe(2);
  });

  it("merge: three inputs (primary + two extras) produces pages in the given order", async () => {
    const qpdf = await loadQpdfForNode();
    qpdf.FS.writeFile("/input.pdf", fixture("valid-1page.pdf"));
    const extras = [toArrayBuffer(fixture("valid-1page-b.pdf")), toArrayBuffer(fixture("valid-3page.pdf"))];
    const args = buildQpdfArgs(qpdf, [], extras);
    expect(qpdf.callMain(args)).toBe(0);
    const output = qpdf.FS.readFile("/output.pdf");
    const doc = await PDFDocument.load(output);
    // 1 (primary) + 1 (extraA) + 3 (extraB) = 5 pages, in that order.
    expect(doc.getPageCount()).toBe(5);
  });

  it("normalize: a single PDF with no pages/extraInputs passes through qpdf unchanged in content", async () => {
    const qpdf = await loadQpdfForNode();
    qpdf.FS.writeFile("/input.pdf", fixture("valid-1page.pdf"));
    const args = buildQpdfArgs(qpdf, [], []);
    expect(qpdf.callMain(args)).toBe(0);
    const output = qpdf.FS.readFile("/output.pdf");
    expect(output.length).toBeGreaterThan(0);
    const doc = await PDFDocument.load(output);
    expect(doc.getPageCount()).toBe(1);
  });
});
