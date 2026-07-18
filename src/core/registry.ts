import type { FileFormat } from "./types";

// Declarative map of every supported conversion. The workers lazy-load the
// module that owns a pair only when a job actually needs it, so this registry
// costs nothing at startup. Converter modules (T3-T5) register their loader
// in workers/convert.worker.ts; the UI (T6) reads `targetsFor` to render the
// target picker.

export interface ConversionEntry {
  source: FileFormat;
  target: FileFormat;
  /** Which converter module owns this pair (drives the dynamic import). */
  module: "pdf" | "image" | "office";
}

export const CONVERSIONS: readonly ConversionEntry[] = [
  // T3 — PDF module
  { source: "pdf", target: "png", module: "pdf" },
  { source: "pdf", target: "jpeg", module: "pdf" },
  { source: "png", target: "pdf", module: "pdf" },
  { source: "jpeg", target: "pdf", module: "pdf" },
  { source: "webp", target: "pdf", module: "pdf" },
  // Merge and split both map pdf -> pdf; options.pages distinguishes them.
  { source: "pdf", target: "pdf", module: "pdf" },
  // T4 — image module
  { source: "png", target: "jpeg", module: "image" },
  { source: "png", target: "webp", module: "image" },
  { source: "png", target: "avif", module: "image" },
  { source: "jpeg", target: "png", module: "image" },
  { source: "jpeg", target: "webp", module: "image" },
  { source: "jpeg", target: "avif", module: "image" },
  { source: "webp", target: "png", module: "image" },
  { source: "webp", target: "jpeg", module: "image" },
  { source: "webp", target: "avif", module: "image" },
  { source: "avif", target: "png", module: "image" },
  { source: "avif", target: "jpeg", module: "image" },
  { source: "avif", target: "webp", module: "image" },
  { source: "svg", target: "png", module: "image" },
  // T5 — office module
  { source: "xlsx", target: "csv", module: "office" },
  { source: "xlsx", target: "json", module: "office" },
  { source: "xlsx", target: "html", module: "office" },
  { source: "xlsx", target: "pdf", module: "office" },
  { source: "csv", target: "xlsx", module: "office" },
  { source: "docx", target: "pdf", module: "office" },
] as const;

export function targetsFor(source: FileFormat): FileFormat[] {
  return CONVERSIONS.filter((c) => c.source === source).map((c) => c.target);
}

export function findEntry(source: FileFormat, target: FileFormat): ConversionEntry | null {
  return CONVERSIONS.find((c) => c.source === source && c.target === target) ?? null;
}
