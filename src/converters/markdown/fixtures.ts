// Test-only helper: loads the committed binary/text fixtures from
// tests/fixtures/ as ArrayBuffers. Local copy of the same tiny helper the
// office module keeps in office/fixtures.ts, duplicated rather than
// cross-imported for the same worktree-isolation reason as docx-guard.ts.
//
// Deliberately NOT using shared/binary.ts's toArrayBuffer() here: that
// helper does `bytes.slice().buffer`, which is only a real copy for a
// genuine Uint8Array. Node's Buffer overrides `slice()` with `subarray()`
// semantics (a VIEW, not a copy) -- and `readFileSync` on a small file
// (observed: under Buffer.poolSize, 8192 bytes) returns a Buffer that is
// itself a view into a shared pool ArrayBuffer. Chaining `.slice().buffer`
// on that Buffer therefore returns the *entire 8192-byte pool*, not the
// file's real byte length -- verified directly (a 527-byte fixture came
// back as an 8192-byte ArrayBuffer padded with unrelated pool memory).
// `new Uint8Array(buffer)` always copies (distinct constructor semantics,
// true for both Buffer and Uint8Array inputs), which is what is used here.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "tests", "fixtures");

export function loadFixture(name: string): ArrayBuffer {
  const buffer = readFileSync(join(fixturesDir, name));
  return new Uint8Array(buffer).buffer;
}

export function loadTextFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8");
}
