// Test-only helper: extracts the plain text drawn into a pdf-lib PDF by
// inflating its (Flate-compressed) content streams and decoding the hex
// string operands pdf-lib uses for Tj/TJ text-drawing operators. Local copy
// of the office module's pdf-inspect-test-helper.ts (same reasoning as
// docx-guard.ts: duplicated rather than cross-imported so this team never
// depends on another team's in-flight worktree file). Only ever imported
// from *.test.ts files, never from converter modules, so it never reaches
// the production bundle.
import { inflateSync } from "node:zlib";

const STREAM_RE = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
const HEX_TJ_RE = /<([0-9A-Fa-f]+)>\s*Tj/g;
const HEX_TJ_ARRAY_RE = /\[((?:<[0-9A-Fa-f]+>\s*-?\d*\s*)+)\]\s*TJ/g;
const HEX_TOKEN_RE = /<([0-9A-Fa-f]+)>/g;

function decodeHexString(hex: string): string {
  const bytes = hex.match(/.{1,2}/g) ?? [];
  return bytes.map((byte) => String.fromCharCode(Number.parseInt(byte, 16))).join("");
}

function extractFromInflated(content: string): string {
  let text = "";
  let match = HEX_TJ_RE.exec(content);
  while (match !== null) {
    const hex = match[1];
    if (hex !== undefined) text += decodeHexString(hex);
    match = HEX_TJ_RE.exec(content);
  }
  HEX_TJ_RE.lastIndex = 0;

  let arrayMatch = HEX_TJ_ARRAY_RE.exec(content);
  while (arrayMatch !== null) {
    const group = arrayMatch[1] ?? "";
    let tokenMatch = HEX_TOKEN_RE.exec(group);
    while (tokenMatch !== null) {
      const hex = tokenMatch[1];
      if (hex !== undefined) text += decodeHexString(hex);
      tokenMatch = HEX_TOKEN_RE.exec(group);
    }
    arrayMatch = HEX_TJ_ARRAY_RE.exec(content);
  }
  HEX_TJ_ARRAY_RE.lastIndex = 0;

  return text;
}

/** Returns the concatenation of every text run drawn into the PDF. */
export function extractPdfText(pdfBytes: ArrayBuffer): string {
  const raw = Buffer.from(pdfBytes).toString("latin1");
  let combined = "";
  let match = STREAM_RE.exec(raw);
  while (match !== null) {
    const body = match[1] ?? "";
    const rawBuffer = Buffer.from(body, "latin1");
    try {
      const inflated = inflateSync(rawBuffer).toString("latin1");
      combined += extractFromInflated(inflated);
    } catch {
      // Not a Flate-compressed stream (e.g. an xref stream or raw binary
      // asset) -- irrelevant to text extraction, skip it.
    }
    match = STREAM_RE.exec(raw);
  }
  return combined;
}
