import type { FileFormat } from "./types";

// Magic-byte signatures checked against the first bytes of the file.
// Extension alone is never trusted: a renamed .docx stays a zip container.
const SIGNATURES: Array<{ format: FileFormat; bytes: number[]; offset: number }> = [
  { format: "pdf", bytes: [0x25, 0x50, 0x44, 0x46], offset: 0 }, // %PDF
  { format: "png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
  { format: "jpeg", bytes: [0xff, 0xd8, 0xff], offset: 0 },
  { format: "zip", bytes: [0x50, 0x4b, 0x03, 0x04], offset: 0 }, // PK.. (also docx/xlsx)
];

const RIFF = [0x52, 0x49, 0x46, 0x46]; // "RIFF" (webp container)
const WEBP = [0x57, 0x45, 0x42, 0x50]; // "WEBP" at offset 8

function matchesAt(view: Uint8Array, bytes: number[], offset: number): boolean {
  if (view.length < offset + bytes.length) return false;
  return bytes.every((b, i) => view[offset + i] === b);
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();
}

/**
 * Detects the format from magic bytes, then disambiguates containers using
 * the file extension (zip -> docx/xlsx) and falls back to extension for pure
 * text formats that have no signature (csv, svg, json, html).
 */
export function detectFormat(fileName: string, data: ArrayBuffer): FileFormat | null {
  const view = new Uint8Array(data.slice(0, 64));
  const ext = extensionOf(fileName);

  if (matchesAt(view, RIFF, 0) && matchesAt(view, WEBP, 8)) return "webp";

  // AVIF: ISO-BMFF "ftypavif" at offset 4.
  const ftypAvif = [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66];
  if (matchesAt(view, ftypAvif, 4)) return "avif";

  for (const sig of SIGNATURES) {
    if (matchesAt(view, sig.bytes, sig.offset)) {
      if (sig.format === "zip") {
        if (ext === "docx") return "docx";
        if (ext === "xlsx") return "xlsx";
        return "zip";
      }
      return sig.format;
    }
  }

  // Text formats: no reliable magic bytes, extension decides.
  if (ext === "csv") return "csv";
  if (ext === "json") return "json";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "svg") return "svg";

  return null;
}
