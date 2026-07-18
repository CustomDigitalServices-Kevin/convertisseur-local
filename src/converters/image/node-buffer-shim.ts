// bmp-js (lib/decoder.js, lib/encoder.js) is written for Node: it reads and
// writes through Node's global `Buffer` (`this.buffer.readUInt32LE(...)`,
// `new Buffer(len)`, `tempBuffer.writeUInt32LE(...)`, `tempBuffer.write(...)`)
// with no fallback. This app's converter modules run inside a Web Worker in
// the browser, where no `Buffer` global exists and no Node polyfill is
// bundled (vite.config.ts has no node-polyfills plugin, by design -- D2 only
// allows the 6 deps this task approved, and `buffer` is not one of them).
//
// This shim implements exactly the subset of Node's `Buffer` API that
// bmp-js's decoder.js and encoder.js call (verified by reading both files in
// full): `toString(encoding, start, end)` (only ever used once, to check the
// "BM" magic), `readUInt8/readUInt16LE/readUInt32LE/readInt32LE`,
// `write(str, offset, length)`, `writeUInt16LE/writeUInt32LE/writeInt32LE`.
// `fill(value, start, end)` and plain indexed reads/writes (`buf[i]`) are
// inherited for free from `Uint8Array`, since Node's `Buffer.prototype.fill`
// has the same signature as `TypedArray.prototype.fill`.
//
// Two things make this safe to implement with a plain `DataView`: every
// instance here is always freshly allocated (`byteOffset` is always 0, since
// `.fromBytes()` always copies rather than aliasing a slice), so a `DataView`
// over `this.buffer` needs no offset bookkeeping; and bmp-js never asks for
// big-endian reads/writes, so only the `*LE` methods are implemented.
export class NodeBufferShim extends Uint8Array {
  private view(): DataView {
    return new DataView(this.buffer);
  }

  static fromBytes(bytes: Uint8Array): NodeBufferShim {
    const shim = new NodeBufferShim(bytes.length);
    shim.set(bytes);
    return shim;
  }

  override toString(encoding = "utf-8", start = 0, end = this.length): string {
    return new TextDecoder(encoding).decode(this.subarray(start, end));
  }

  readUInt8(offset: number): number {
    return this.view().getUint8(offset);
  }

  readUInt16LE(offset: number): number {
    return this.view().getUint16(offset, true);
  }

  readUInt32LE(offset: number): number {
    return this.view().getUint32(offset, true);
  }

  readInt32LE(offset: number): number {
    return this.view().getInt32(offset, true);
  }

  writeUInt16LE(value: number, offset: number): number {
    this.view().setUint16(offset, value, true);
    return offset + 2;
  }

  writeUInt32LE(value: number, offset: number): number {
    this.view().setUint32(offset, value, true);
    return offset + 4;
  }

  writeInt32LE(value: number, offset: number): number {
    this.view().setInt32(offset, value, true);
    return offset + 4;
  }

  /** Node's `buf.write(string, offset, length)`, UTF-8 only (bmp-js only ever writes the ASCII "BM" flag). */
  write(text: string, offset: number, length: number): number {
    const encoded = new TextEncoder().encode(text).subarray(0, length);
    this.set(encoded, offset);
    return encoded.length;
  }
}

/**
 * Installs `NodeBufferShim` as the global `Buffer` for the duration of `run`,
 * restoring whatever was there before (nothing, in this app's Worker) once
 * `run` settles. bmp-js's decoder/encoder both construct `new Buffer(...)`
 * internally (decoder.js `parseRGBA`, encoder.js `encode`), so this must be
 * in place before either is called, not just around the caller-supplied
 * input buffer.
 */
export function withNodeBufferGlobal<T>(run: () => T): T {
  const globalWithBuffer = globalThis as unknown as { Buffer?: unknown };
  const previous = globalWithBuffer.Buffer;
  globalWithBuffer.Buffer = NodeBufferShim;
  try {
    return run();
  } finally {
    globalWithBuffer.Buffer = previous;
  }
}
