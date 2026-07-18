// Filename + MIME helpers for the markdown converter family. Kept local to
// this directory (rather than importing from ../office/naming.ts) so this
// team file never depends on another phase-B team file while both are being
// developed in parallel worktrees -- the only cross-team touchpoint is the
// one loader line in ../../workers/module-loaders.ts (see src/core/README.md).

const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? fileName : fileName.slice(0, dot);
}

export function sanitizeForFilename(name: string): string {
  const cleaned = name.replaceAll(ILLEGAL_FILENAME_CHARS, "_").trim();
  return cleaned.length === 0 ? "document" : cleaned;
}

export const MIME_TYPES = {
  html: "text/html",
  md: "text/markdown",
  txt: "text/plain",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  epub: "application/epub+zip",
} as const;

/** Minimal HTML-entity escaping for text interpolated into an HTML document shell. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Derives a human-readable document title from a source file name. */
export function titleFromFileName(fileName: string): string {
  const stem = baseName(fileName).replaceAll(/[-_]+/g, " ").trim();
  return stem.length === 0 ? "Document" : stem;
}
