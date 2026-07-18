import { describe, expect, it } from "vitest";
import { Buffer } from "node:buffer";
import { toArrayBuffer } from "./binary";

describe("toArrayBuffer", () => {
  it("returns an exact-length copy for a plain Uint8Array view into a larger buffer", () => {
    const backing = new ArrayBuffer(64);
    const view = new Uint8Array(backing, 8, 4);
    view.set([1, 2, 3, 4]);
    const out = toArrayBuffer(view);
    expect(out.byteLength).toBe(4);
    expect(Array.from(new Uint8Array(out))).toEqual([1, 2, 3, 4]);
  });

  it("copies a small Node Buffer without leaking the 8 KiB allocation pool", () => {
    // Buffer.from on a small payload allocates inside Buffer's shared pool,
    // exactly like readFileSync on a small fixture. Buffer overrides .slice()
    // with subarray semantics, which is why toArrayBuffer must never rely on
    // slice() — this is the regression caught on 2026-07-18.
    const small = Buffer.from("# tiny markdown fixture");
    const out = toArrayBuffer(small);
    expect(out.byteLength).toBe(small.length);
    expect(new TextDecoder().decode(out)).toBe("# tiny markdown fixture");
  });

  it("mutating the source afterwards does not affect the copy", () => {
    const src = new Uint8Array([9, 9, 9]);
    const out = toArrayBuffer(src);
    src[0] = 0;
    expect(new Uint8Array(out)[0]).toBe(9);
  });
});
