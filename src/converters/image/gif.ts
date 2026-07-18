import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { GifReader } from "omggif";
import { ConversionError } from "../../core/types";
import { toArrayBuffer } from "../shared/binary";

// GIF decode (first frame only -- this module's targets are all static
// image formats, so animation is out of scope) via omggif, and encode via
// gifenc's quantizer + LZW encoder. Both are pure-JS, no OffscreenCanvas
// dependency, so this file runs fine under Vitest/happy-dom -- see
// gif.test.ts.

export function decodeGif(data: ArrayBuffer): ImageData {
  let reader: GifReader;
  try {
    reader = new GifReader(new Uint8Array(data));
  } catch (error) {
    throw new ConversionError("corrupted-file", `GIF decode failed: ${String(error)}`);
  }
  if (reader.numFrames() === 0) {
    throw new ConversionError("corrupted-file", "GIF has no frames");
  }

  const pixels = new Uint8ClampedArray(reader.width * reader.height * 4);
  try {
    reader.decodeAndBlitFrameRGBA(0, pixels);
  } catch (error) {
    throw new ConversionError("corrupted-file", `GIF frame decode failed: ${String(error)}`);
  }
  return new ImageData(pixels, reader.width, reader.height);
}

export function encodeGif(imageData: ImageData): ArrayBuffer {
  const { data, width, height } = imageData;
  try {
    const palette = quantize(data, 256);
    const indexed = applyPalette(data, palette);
    const gif = GIFEncoder();
    gif.writeFrame(indexed, width, height, { palette });
    gif.finish();
    return toArrayBuffer(gif.bytes());
  } catch (error) {
    throw new ConversionError("internal-error", `GIF encode failed: ${String(error)}`);
  }
}
