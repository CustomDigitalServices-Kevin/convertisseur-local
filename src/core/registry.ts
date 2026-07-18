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
  module: "pdf" | "image" | "office" | "markdown" | "data";
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
  // v2 — markdown module (T10)
  { source: "md", target: "html", module: "markdown" },
  { source: "md", target: "pdf", module: "markdown" },
  { source: "md", target: "docx", module: "markdown" },
  { source: "md", target: "txt", module: "markdown" },
  { source: "md", target: "epub", module: "markdown" },
  { source: "html", target: "md", module: "markdown" },
  { source: "html", target: "txt", module: "markdown" },
  { source: "html", target: "epub", module: "markdown" },
  { source: "docx", target: "md", module: "markdown" },
  { source: "pdf", target: "md", module: "markdown" },
  { source: "pdf", target: "docx", module: "markdown" },
  { source: "pdf", target: "txt", module: "markdown" },
  { source: "txt", target: "pdf", module: "markdown" },
  { source: "txt", target: "md", module: "markdown" },
  // v2 — data module (T11)
  { source: "yaml", target: "json", module: "data" },
  { source: "json", target: "yaml", module: "data" },
  { source: "xml", target: "json", module: "data" },
  { source: "json", target: "xml", module: "data" },
  { source: "json", target: "csv", module: "data" },
  { source: "csv", target: "json", module: "data" },
  // v2 — image module extensions (T11)
  { source: "tiff", target: "png", module: "image" },
  { source: "tiff", target: "jpeg", module: "image" },
  { source: "tiff", target: "webp", module: "image" },
  { source: "png", target: "tiff", module: "image" },
  { source: "jpeg", target: "tiff", module: "image" },
  { source: "gif", target: "png", module: "image" },
  { source: "gif", target: "webp", module: "image" },
  { source: "png", target: "gif", module: "image" },
  { source: "jpeg", target: "gif", module: "image" },
  { source: "bmp", target: "png", module: "image" },
  { source: "bmp", target: "jpeg", module: "image" },
  { source: "png", target: "bmp", module: "image" },
  { source: "jpeg", target: "bmp", module: "image" },
] as const;

export function targetsFor(source: FileFormat): FileFormat[] {
  return CONVERSIONS.filter((c) => c.source === source).map((c) => c.target);
}

export function findEntry(source: FileFormat, target: FileFormat): ConversionEntry | null {
  return CONVERSIONS.find((c) => c.source === source && c.target === target) ?? null;
}
