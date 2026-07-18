// Small binary helper shared by every converter module.

/**
 * Copies `bytes` into a freshly allocated, exactly sized ArrayBuffer.
 *
 * Must NOT use `bytes.slice()`: Node's `Buffer` (which extends Uint8Array
 * and is what `readFileSync`/ExcelJS return) OVERRIDES `.slice()` with
 * `.subarray()` semantics — a view into the shared 8 KiB allocation pool,
 * not a copy. For sub-pool-size inputs, `.slice().buffer` therefore leaks
 * the whole pool: an 8192-byte buffer whose tail is unrelated process
 * memory (caught by two converter teams on small test fixtures, 2026-07-18).
 * `new Uint8Array(view)` copies unconditionally per spec, for both plain
 * Uint8Arrays and Buffers, and its `.buffer` is exact-length and unshared.
 */
export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}
