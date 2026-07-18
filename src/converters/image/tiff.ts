import UTIF from "utif";
import { ConversionError } from "../../core/types";

// TIFF decode/encode via utif: a pure-JS codec with no OffscreenCanvas
// dependency, so (unlike canvas.ts's raster codecs) this file runs fine
// under Vitest/happy-dom -- see tiff.test.ts.

export function decodeTiff(data: ArrayBuffer): ImageData {
  let ifds: ReturnType<typeof UTIF.decode>;
  try {
    ifds = UTIF.decode(data);
  } catch (error) {
    throw new ConversionError("corrupted-file", `TIFF decode failed: ${String(error)}`);
  }
  const first = ifds[0];
  if (first === undefined) {
    throw new ConversionError("corrupted-file", "TIFF file has no pages");
  }

  UTIF.decodeImage(data, first, ifds);
  const { width, height } = first;
  if (width === undefined || height === undefined) {
    throw new ConversionError("corrupted-file", "TIFF page decoded with no dimensions");
  }

  const rgba = UTIF.toRGBA8(first);
  // A values-copy (not a zero-copy buffer view): toRGBA8's return type is
  // Uint8Array<ArrayBufferLike>, and ImageData requires an ArrayBuffer-backed
  // Uint8ClampedArray specifically (see shared/binary.ts's toArrayBuffer for
  // the same ArrayBufferLike-vs-ArrayBuffer distinction). The copy is a
  // single pass over already-decoded pixel data, negligible next to the
  // decode itself.
  return new ImageData(new Uint8ClampedArray(rgba), width, height);
}

export function encodeTiff(imageData: ImageData): ArrayBuffer {
  try {
    return UTIF.encodeImage(imageData.data, imageData.width, imageData.height);
  } catch (error) {
    throw new ConversionError("internal-error", `TIFF encode failed: ${String(error)}`);
  }
}
