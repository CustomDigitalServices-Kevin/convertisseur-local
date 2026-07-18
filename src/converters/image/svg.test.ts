import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveFitTo, svgToPng } from "./svg";

// resvg-wasm's WASM binary is normally fetched from the Vite-emitted asset
// URL (see the comment on `ensureWasmReady` in svg.ts), which only resolves
// inside a real browser/worker. `vitest run` executes under plain Node with
// no dev server to serve that URL, so these tests inject the WASM bytes
// read directly from node_modules instead, via svgToPng's optional
// wasmSource parameter. This exercises the exact same resvg WASM binary and
// rendering logic that ships to the browser; only the byte source differs.
// The Vite asset-URL wiring itself, and every other codec path in this
// module (canvas.ts, avif.ts's browser auto-init), is covered by the E2E
// suite (task 7), which runs in a real browser with a real dev server.
const require = createRequire(import.meta.url);
const wasmBytes = readFileSync(require.resolve("@resvg/resvg-wasm/index_bg.wasm"));

// happy-dom (this suite's test environment) installs its own global `URL`
// class, which is not the same constructor Node's `fs` module checks for
// when given a URL object (`new URL(..., import.meta.url)` throws "The URL
// must be of scheme file" as a result). `import.meta.dirname` sidesteps the
// whole URL-instance question by giving a plain path string instead.
const fixturesDir = join(import.meta.dirname, "../../../tests/fixtures");
const withSize = readFileSync(join(fixturesDir, "sample.svg"));
const viewBoxOnly = readFileSync(join(fixturesDir, "sample-viewbox-only.svg"));
const invalid = readFileSync(join(fixturesDir, "sample-invalid.svg"));

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  const out = new ArrayBuffer(buf.byteLength);
  new Uint8Array(out).set(buf);
  return out;
}

function readPngSignature(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer, 0, 8);
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return signature.every((byte, index) => bytes[index] === byte);
}

// Width/height live as big-endian uint32 at fixed offsets 16/20 of a PNG's
// IHDR chunk (right after the 8-byte signature + 8-byte chunk header).
function readPngDimensions(buffer: ArrayBuffer): { width: number; height: number } {
  const view = new DataView(buffer);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe("resolveFitTo", () => {
  it("uses original mode when no width is given", () => {
    expect(resolveFitTo(undefined)).toEqual({ mode: "original" });
  });

  it("uses width mode with the requested value", () => {
    expect(resolveFitTo(320)).toEqual({ mode: "width", value: 320 });
  });
});

describe("svgToPng", () => {
  it("rasterizes an SVG with explicit width/height to a PNG at that intrinsic size", async () => {
    const png = await svgToPng(toArrayBuffer(withSize), undefined, wasmBytes);
    expect(readPngSignature(png)).toBe(true);
    expect(readPngDimensions(png)).toEqual({ width: 40, height: 20 });
  });

  it("scales a viewBox-only SVG (no width/height attrs) to the requested width, preserving aspect ratio", async () => {
    const png = await svgToPng(toArrayBuffer(viewBoxOnly), 100, wasmBytes);
    // viewBox is 200x100 (2:1); requesting width=100 should yield height=50.
    expect(readPngDimensions(png)).toEqual({ width: 100, height: 50 });
  });

  it("rasterizes a viewBox-only SVG at its intrinsic (viewBox-derived) size when no width is requested", async () => {
    const png = await svgToPng(toArrayBuffer(viewBoxOnly), undefined, wasmBytes);
    expect(readPngDimensions(png)).toEqual({ width: 200, height: 100 });
  });

  it("throws a corrupted-file ConversionError for invalid SVG markup", async () => {
    await expect(svgToPng(toArrayBuffer(invalid), undefined, wasmBytes)).rejects.toMatchObject({
      code: "corrupted-file",
    });
  });
});
