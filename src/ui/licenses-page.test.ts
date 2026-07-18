import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RUNTIME_LICENSES } from "./LicensesPage";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

interface PackageManifest {
  dependencies: Record<string, string>;
}

describe("third-party licenses page", () => {
  it("credits every runtime dependency from package.json", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as PackageManifest;
    const covered = new Set(RUNTIME_LICENSES.flatMap((entry) => entry.covers));
    const missing = Object.keys(manifest.dependencies).filter((dep) => !covered.has(dep));
    expect(missing, `Add these to RUNTIME_LICENSES in LicensesPage.tsx: ${missing.join(", ")}`)
      .toEqual([]);
  });

  it("does not credit packages that are no longer dependencies", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as PackageManifest;
    const deps = new Set(Object.keys(manifest.dependencies));
    const stale = RUNTIME_LICENSES.flatMap((entry) => entry.covers).filter(
      (name) => !deps.has(name),
    );
    expect(stale, `Remove stale entries from RUNTIME_LICENSES: ${stale.join(", ")}`).toEqual([]);
  });
});
