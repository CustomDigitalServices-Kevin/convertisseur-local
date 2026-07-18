import bmpJs from "bmp-js";
import type { BmpBuffer } from "bmp-js";
import { ConversionError } from "../../core/types";
import { NodeBufferShim, withNodeBufferGlobal } from "./node-buffer-shim";
import { toArrayBuffer } from "../shared/binary";

// BMP decode/encode via bmp-js, a Node-oriented library that both reads and
// writes through the global `Buffer` API -- see node-buffer-shim.ts for why
// that needs a shim in a Worker, and bmp-js.d.ts for the verified ABGR byte
// order (not RGBA) this library uses on both sides.

function bmpBufferToUint8Array(buffer: BmpBuffer): Uint8Array {
  const out = new Uint8Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) out[i] = buffer[i] ?? 0;
  return out;
}

export function decodeBmp(data: ArrayBuffer): ImageData {
  return withNodeBufferGlobal(() => {
    const input = NodeBufferShim.fromBytes(new Uint8Array(data));
    let decoded: ReturnType<typeof bmpJs.decode>;
    try {
      decoded = bmpJs.decode(input);
    } catch (error) {
      throw new ConversionError("corrupted-file", `BMP decode failed: ${String(error)}`);
    }

    const { width, height, bitPP, data: abgr } = decoded;
    // Only 32bpp BMPs carry a real alpha channel through bmp-js's decoder
    // (verified in bmp-js.d.ts's header comment); every other depth
    // hardcodes the alpha byte to 0, which must read as "fully opaque", not
    // "fully transparent".
    const hasRealAlpha = bitPP === 32;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < rgba.length; i += 4) {
      const a = abgr[i] ?? 0;
      const b = abgr[i + 1] ?? 0;
      const g = abgr[i + 2] ?? 0;
      const r = abgr[i + 3] ?? 0;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = hasRealAlpha ? a : 255;
    }
    return new ImageData(rgba, width, height);
  });
}

export function encodeBmp(imageData: ImageData): ArrayBuffer {
  return withNodeBufferGlobal(() => {
    const { data: rgba, width, height } = imageData;
    const abgr = NodeBufferShim.fromBytes(new Uint8Array(rgba.length));
    for (let i = 0; i < rgba.length; i += 4) {
      abgr[i] = rgba[i + 3] ?? 0; // a (unused by the encoder, kept for shape parity)
      abgr[i + 1] = rgba[i + 2] ?? 0; // b
      abgr[i + 2] = rgba[i + 1] ?? 0; // g
      abgr[i + 3] = rgba[i] ?? 0; // r
    }
    try {
      const encoded = bmpJs.encode({ data: abgr, width, height });
      return toArrayBuffer(bmpBufferToUint8Array(encoded.data));
    } catch (error) {
      throw new ConversionError("internal-error", `BMP encode failed: ${String(error)}`);
    }
  });
}
