import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import { decodeAvif, encodeAvif } from "./avif";

// @jsquash/avif's default WASM auto-init resolves each codec's .wasm binary
// relative to its own bundled JS via import.meta.url, a pattern Vite
// rewrites to a real asset URL at build/dev time. `vitest run` executes
// under plain Node with no dev server to serve that URL, so — exactly like
// jSquash's own documented Node.js example (examples/with-node/index.js,
// which does the same for the jpeg/png codecs) — both codecs are compiled
// here from the WASM files on disk instead of being fetched. Decode is
// initialized once via its `/decode` subpath's `init` export (see the
// module-scope comment below); encode is compiled once and passed directly
// into every encodeAvif() call via its `precompiledWasm` injection
// parameter (see avif.ts). Either way this exercises the real codec and the
// real avif.ts wrapper logic (quality scaling, error mapping) end-to-end;
// only the WASM byte source differs from the browser path.
const require = createRequire(import.meta.url);

// decodeAvif relies on @jsquash/avif's own default auto-init gate (it never
// forces a codec module the way encodeAvif does), and that gate is shared
// module state across every import of the package (index.js re-exports the
// exact same decode.js instance) - so initializing it once here is enough
// for every decodeAvif() call in this file to skip its own fetch.
// encodeAvif has its own explicit injection parameter instead (see avif.ts),
// so its compiled module is passed directly into each call below.
let encWasmModule: WebAssembly.Module;

beforeAll(async () => {
  const { init: initDecode } = await import("@jsquash/avif/decode.js");
  const [decWasm, encWasm] = await Promise.all([
    WebAssembly.compile(readFileSync(require.resolve("@jsquash/avif/codec/dec/avif_dec.wasm"))),
    WebAssembly.compile(readFileSync(require.resolve("@jsquash/avif/codec/enc/avif_enc.wasm"))),
  ]);
  await initDecode(decWasm);
  encWasmModule = encWasm;
});

function makeSolidImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = 200;
    data[i * 4 + 1] = 80;
    data[i * 4 + 2] = 40;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height, colorSpace: "srgb" };
}

describe("encodeAvif / decodeAvif", () => {
  it("round-trips ImageData through AVIF encode then decode with matching dimensions", async () => {
    const source = makeSolidImageData(4, 4);
    const encoded = await encodeAvif(source, 0.8, encWasmModule);
    expect(encoded.byteLength).toBeGreaterThan(0);

    const decoded = await decodeAvif(encoded);
    expect(decoded.width).toBe(4);
    expect(decoded.height).toBe(4);
    expect(decoded.data.length).toBe(4 * 4 * 4);
  });

  it("scales the 0..1 quality option onto jsquash's 0..100 scale (lower quality -> smaller output)", async () => {
    const source = makeSolidImageData(16, 16);
    const high = await encodeAvif(source, 0.95, encWasmModule);
    const low = await encodeAvif(source, 0.05, encWasmModule);
    expect(low.byteLength).toBeLessThan(high.byteLength);
  });

  it("throws a corrupted-file ConversionError for garbage input", async () => {
    const garbage = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    await expect(decodeAvif(garbage)).rejects.toMatchObject({ code: "corrupted-file" });
  });
});
