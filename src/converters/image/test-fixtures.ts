// Test-only helper: loads a committed binary fixture from tests/fixtures/ as
// an ArrayBuffer, for the new tiff/gif/bmp fixtures this task added.
//
// office/fixtures.ts already has a loadFixture() doing the same job, but its
// toArrayBuffer(readFileSync(path)) call is unsafe for small files: Node's
// Buffer.prototype.slice() -- unlike Uint8Array.prototype.slice(), which
// toArrayBuffer's own doc comment correctly describes -- returns a VIEW
// sharing the original backing ArrayBuffer rather than a copy. readFileSync
// on a small file is very likely backed by Node's ~8KB internal buffer pool,
// so office/fixtures.ts's pattern silently returns an oversized,
// wrongly-offset ArrayBuffer. Verified directly: reading the 1016-byte
// tiny.tiff fixture that way returned an 8192-byte buffer with the real
// bytes starting at byteOffset 8, which corrupted utif's absolute-offset
// TIFF parsing (decodeTiff failed with "no dimensions" on a file that
// decodes fine when read correctly). Flagged to the team -- office/fixtures.ts
// is shared but outside this task's directories, so this file works around
// it locally rather than editing shared code.
//
// The fix: `new Uint8Array(buffer)` as a *constructor* call (not
// buffer.slice()) always copies per spec regardless of Buffer's override,
// producing a plain Uint8Array that toArrayBuffer's own slice()-based copy
// then handles correctly.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toArrayBuffer } from "../shared/binary";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "tests", "fixtures");

export function loadImageFixture(name: string): ArrayBuffer {
  return toArrayBuffer(new Uint8Array(readFileSync(join(fixturesDir, name))));
}
