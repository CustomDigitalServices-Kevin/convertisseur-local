// Filename helpers shared by every office converter: deriving an output
// stem from the source name, and making a worksheet name safe to use as a
// filename fragment on all three major desktop OSes.

const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? fileName : fileName.slice(0, dot);
}

export function sanitizeForFilename(name: string): string {
  const cleaned = name.replaceAll(ILLEGAL_FILENAME_CHARS, "_").trim();
  return cleaned.length === 0 ? "sheet" : cleaned;
}

export const MIME_TYPES = {
  csv: "text/csv",
  json: "application/json",
  html: "text/html",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;
