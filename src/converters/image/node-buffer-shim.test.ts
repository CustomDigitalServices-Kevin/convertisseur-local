import { describe, expect, it } from "vitest";
import { NodeBufferShim, withNodeBufferGlobal } from "./node-buffer-shim";

describe("NodeBufferShim", () => {
  it("fromBytes copies (does not alias) the source bytes", () => {
    const source = new Uint8Array([1, 2, 3]);
    const shim = NodeBufferShim.fromBytes(source);
    source[0] = 99;
    expect(Array.from(shim)).toEqual([1, 2, 3]);
  });

  it("toString decodes a byte range as UTF-8, matching Node's Buffer#toString(encoding, start, end)", () => {
    const shim = NodeBufferShim.fromBytes(new TextEncoder().encode("XXBMYY"));
    expect(shim.toString("utf-8", 2, 4)).toBe("BM");
  });

  it("toString defaults to the whole buffer with zero arguments, like Uint8Array's inherited toString contract", () => {
    const shim = NodeBufferShim.fromBytes(new TextEncoder().encode("hi"));
    expect(shim.toString()).toBe("hi");
  });

  it("reads little-endian integers written by the matching write method", () => {
    const shim = new NodeBufferShim(10);
    shim.writeUInt16LE(0x1234, 0);
    shim.writeUInt32LE(0xdeadbeef, 2);
    shim.writeInt32LE(-1, 6);
    expect(shim.readUInt16LE(0)).toBe(0x1234);
    expect(shim.readUInt32LE(2)).toBe(0xdeadbeef);
    expect(shim.readInt32LE(6)).toBe(-1);
  });

  it("readUInt8 reads a single byte", () => {
    const shim = NodeBufferShim.fromBytes(new Uint8Array([7, 200]));
    expect(shim.readUInt8(0)).toBe(7);
    expect(shim.readUInt8(1)).toBe(200);
  });

  it("write encodes ASCII text at the given offset and returns the byte count", () => {
    const shim = new NodeBufferShim(4);
    const written = shim.write("BM", 0, 2);
    expect(written).toBe(2);
    expect(shim.toString("utf-8", 0, 2)).toBe("BM");
  });

  it("fill is inherited from Uint8Array and works with Node's (value, start, end) signature", () => {
    const shim = new NodeBufferShim(4);
    shim.fill(9, 1, 3);
    expect(Array.from(shim)).toEqual([0, 9, 9, 0]);
  });
});

describe("withNodeBufferGlobal", () => {
  // Under Vitest (a Node process), globalThis.Buffer is Node's real Buffer
  // before this runs -- unlike the browser Worker this shim targets in
  // production, where it is genuinely undefined. Both tests capture
  // whatever was there beforehand instead of assuming either case, so they
  // exercise the actual save/restore contract in whichever environment runs
  // them.

  it("installs NodeBufferShim as globalThis.Buffer only for the duration of the callback", () => {
    const globalWithBuffer = globalThis as unknown as { Buffer?: unknown };
    const before = globalWithBuffer.Buffer;
    let sawInside: unknown;
    const result = withNodeBufferGlobal(() => {
      sawInside = globalWithBuffer.Buffer;
      return 42;
    });
    expect(sawInside).toBe(NodeBufferShim);
    expect(result).toBe(42);
    expect(globalWithBuffer.Buffer).toBe(before);
  });

  it("restores the previous global even if the callback throws", () => {
    const globalWithBuffer = globalThis as unknown as { Buffer?: unknown };
    const before = globalWithBuffer.Buffer;
    expect(() =>
      withNodeBufferGlobal(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(globalWithBuffer.Buffer).toBe(before);
  });
});
