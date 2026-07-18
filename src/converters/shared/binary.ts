// Small binary helper shared by every office converter.

/**
 * Copies `bytes` into a freshly allocated, exactly sized ArrayBuffer.
 *
 * `Uint8Array#slice()` (no arguments) always allocates a fresh, non-shared,
 * exact-length ArrayBuffer per spec, so TypeScript's generic typed-array
 * typings narrow its `.buffer` to plain `ArrayBuffer` on their own. Every
 * byte array passed through this module is copied here before leaving a
 * converter — notably a Node `Buffer` returned by a Node-oriented library
 * like ExcelJS (Buffer extends Uint8Array, so it is a valid input here too)
 * — which also guards against a view whose backing buffer is larger than
 * the view itself (e.g. a subarray).
 */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}
