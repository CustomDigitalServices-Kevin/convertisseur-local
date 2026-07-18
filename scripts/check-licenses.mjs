// License gate for rule D2 (memory: Obsidian "Convertisseur Local" décisions).
// Fails the build if any installed package (prod or dev) declares a license
// outside the allowlist. AGPL/LGPL must never enter this project, even as a
// transitive dependency, because the app bundles everything client-side.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ALLOWED = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "MPL-2.0",
  "ISC",
  "0BSD",
  "CC0-1.0",
  "Unlicense",
  "BlueOak-1.0.0",
  "CC-BY-4.0",
  "Python-2.0",
]);

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const nodeModules = join(root, "node_modules");

function listPackageDirs(dir) {
  const dirs = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.name.startsWith("@")) {
      dirs.push(...listPackageDirs(full));
    } else {
      dirs.push(full);
    }
  }
  return dirs;
}

function licenseExpressionAllowed(expression) {
  // Handles plain IDs and simple OR expressions like "(MIT OR Apache-2.0)".
  const cleaned = expression.replaceAll("(", "").replaceAll(")", "");
  if (cleaned.includes(" OR ")) {
    return cleaned.split(" OR ").some((part) => ALLOWED.has(part.trim()));
  }
  return cleaned
    .split(" AND ")
    .every((part) => ALLOWED.has(part.trim()));
}

const violations = [];
for (const dir of listPackageDirs(nodeModules)) {
  const manifestPath = join(dir, "package.json");
  if (!existsSync(manifestPath)) continue;
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    continue;
  }
  const license =
    typeof manifest.license === "string"
      ? manifest.license
      : (manifest.license?.type ?? manifest.licenses?.[0]?.type ?? "UNKNOWN");
  if (!licenseExpressionAllowed(license)) {
    violations.push(`${manifest.name ?? dir}@${manifest.version ?? "?"} -> ${license}`);
  }
}

if (violations.length > 0) {
  console.error("License check FAILED. Disallowed licenses found:");
  for (const violation of violations) console.error(`  - ${violation}`);
  process.exit(1);
}
console.log("License check passed: all installed packages are on the allowlist.");
