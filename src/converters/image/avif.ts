import { ConversionError } from "../../core/types";
// Vite-emitted asset URL for the *single-threaded* AVIF encoder WASM binary.
// See the long comment on `ensureEncodeReady` below for why this is fetched
// and initialized manually instead of calling `encode()` straight away.
import avifEncWasmUrl from "@jsquash/avif/codec/enc/avif_enc.wasm?url";

let encodeReady: Promise<void> | null = null;

/**
 * jSquash's AVIF encoder (packages/avif/encode.ts `init()`) auto-selects a
 * multi-threaded WASM build (`avif_enc_mt.wasm`) whenever `wasm-feature-detect`'s
 * `threads()` probe returns true in a browser/worker context. That build
 * spawns pthread workers backed by a `SharedArrayBuffer`, which only exists
 * on a cross-origin-isolated page (`Cross-Origin-Opener-Policy: same-origin`
 * + `Cross-Origin-Embedder-Policy: require-corp`). This app is a static
 * bundle deployed under a path on a shared host (CDS site
 * `/outils/convertisseur/`) with no guaranteed control over response
 * headers, so trusting the auto-detected threaded path risks a hard failure
 * in production for any visitor whose browser passes the threads() probe.
 * We sidestep this entirely by manually compiling and initializing the
 * single-threaded `avif_enc.wasm` codec ourselves before the shared
 * `encode()` export (from the main `@jsquash/avif` entry point) is ever
 * called: its `init()` only runs its own auto-detection when the module
 * hasn't already been initialized, so this forces the safe path
 * deterministically. AVIF decode has no such multi-threaded variant (only
 * `avif_dec.wasm` exists), so it keeps the default auto-init.
 *
 * `precompiled`/`precompiledWasm` let tests inject a `WebAssembly.Module`
 * compiled from the on-disk codec file instead of fetching the Vite asset
 * URL, for the same reason svg.ts's `wasmSource` parameter exists: there is
 * no dev server under `vitest run` to serve that URL. See avif.test.ts.
 */
async function ensureEncodeReady(precompiled?: WebAssembly.Module): Promise<void> {
  encodeReady ??= (async () => {
    const { init } = await import("@jsquash/avif/encode.js");
    const wasmModule = precompiled ?? (await WebAssembly.compileStreaming(fetch(avifEncWasmUrl)));
    await init(wasmModule);
  })();
  await encodeReady;
}

export async function encodeAvif(
  imageData: ImageData,
  quality01: number,
  precompiledWasm?: WebAssembly.Module,
): Promise<ArrayBuffer> {
  await ensureEncodeReady(precompiledWasm);
  const { encode } = await import("@jsquash/avif");
  try {
    return await encode(imageData, { quality: Math.round(quality01 * 100) });
  } catch (error) {
    throw new ConversionError("internal-error", `AVIF encode failed: ${String(error)}`);
  }
}

export async function decodeAvif(data: ArrayBuffer): Promise<ImageData> {
  const { decode } = await import("@jsquash/avif");
  let result: Awaited<ReturnType<typeof decode>>;
  try {
    result = await decode(data);
  } catch (error) {
    throw new ConversionError("corrupted-file", `AVIF decode failed: ${String(error)}`);
  }
  if (result === null) {
    throw new ConversionError("corrupted-file", "AVIF decode returned no image data");
  }
  // decode() is only ever called here without a `bitDepth` option, so the
  // library always takes its 8-bit path (packages/avif/decode.ts default is
  // 8) and resolves a plain ImageData; the wider ImageData16bit branch of
  // its return type only applies when bitDepth is explicitly overridden.
  return result as ImageData;
}
