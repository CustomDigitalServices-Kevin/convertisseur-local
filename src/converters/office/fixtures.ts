// Test-only helper: loads the committed binary fixtures from
// tests/fixtures/ as ArrayBuffers. Regenerate the fixture files themselves
// with `node tests/fixtures/generate.mjs` (see that script for how they
// were built) — this module only reads what is already on disk.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { toArrayBuffer } from "../shared/binary";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "tests", "fixtures");

export function loadFixture(name: string): ArrayBuffer {
  return toArrayBuffer(readFileSync(join(fixturesDir, name)));
}
