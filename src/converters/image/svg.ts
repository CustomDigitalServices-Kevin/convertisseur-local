import { initWasm, Resvg } from "@resvg/resvg-wasm";
import type { InitInput, ResvgRenderOptions } from "@resvg/resvg-wasm";
import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";
import { ConversionError } from "../../core/types";

let wasmReady: Promise<void> | null = null;

/**
 * Lazily initializes the resvg WASM module exactly once for the life of the
 * worker. Production callers omit `wasmSource` and get the Vite-emitted
 * asset URL fetched over HTTP, which only resolves inside a real
 * browser/worker. Tests inject the raw WASM bytes read from disk instead,
 * because `vitest run` executes under plain Node with no dev server to
 * serve that URL (see svg.test.ts). Either way the exact same resvg WASM
 * binary and rendering code runs; only how its bytes are obtained differs.
 */
function ensureWasmReady(wasmSource?: InitInput | Promise<InitInput>): Promise<void> {
  wasmReady ??= initWasm(wasmSource ?? fetch(wasmUrl));
  return wasmReady;
}

/**
 * Resolves the resvg `fitTo` option from the requested output width. With no
 * width, "original" keeps resvg's own intrinsic-size resolution: it uses the
 * SVG's width/height attributes when present, and falls back to the
 * viewBox dimensions when they are absent (the common case for icon-style
 * SVGs authored with only a viewBox).
 */
export function resolveFitTo(width: number | undefined): NonNullable<ResvgRenderOptions["fitTo"]> {
  return width === undefined ? { mode: "original" } : { mode: "width", value: width };
}

export async function svgToPng(
  svgBytes: ArrayBuffer,
  width: number | undefined,
  wasmSource?: InitInput | Promise<InitInput>,
): Promise<ArrayBuffer> {
  await ensureWasmReady(wasmSource);

  let pngBytes: Uint8Array;
  try {
    const renderer = new Resvg(new Uint8Array(svgBytes), { fitTo: resolveFitTo(width) });
    pngBytes = renderer.render().asPng();
  } catch (error) {
    throw new ConversionError("corrupted-file", `SVG render failed: ${String(error)}`);
  }

  // `pngBytes.buffer` is typed ArrayBufferLike (it could theoretically be a
  // SharedArrayBuffer); ConversionOutputFile.data requires a plain
  // ArrayBuffer, so copy into a fresh one rather than casting.
  const out = new ArrayBuffer(pngBytes.byteLength);
  new Uint8Array(out).set(pngBytes);
  return out;
}
