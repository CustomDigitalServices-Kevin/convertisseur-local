// Own, local pdfjs-dist worker-source wiring, following the same pattern as
// src/converters/pdf/pdfjs-runtime.ts (T3): pdfjs ships its parsing work in
// a companion worker script that Vite resolves to a hashed asset URL at
// build time. This is a local copy rather than a cross-team import so this
// team's file never depends on the pdf module team's in-flight worktree;
// Vite still dedupes the underlying pdfjs-dist and pdf.worker.min.mjs
// assets into one shared chunk regardless of how many source files import
// them (both `?url` imports resolve the identical file on disk).
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ConversionError } from "../../core/types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export { pdfjsLib };

/**
 * Maps a pdfjs-dist loading failure to a stable ConversionError. pdfjs
 * throws plain objects with a `.name` discriminator (PasswordException /
 * InvalidPDFException) rather than subclasses that survive structured
 * cloning, so matching on `.name` is the documented way to tell these apart
 * (mozilla/pdf.js src/shared/util.js).
 */
export function toPdfjsConversionError(error: unknown): ConversionError {
  if (error instanceof ConversionError) return error;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  if (name === "PasswordException") return new ConversionError("password-protected", message);
  if (name === "InvalidPDFException") return new ConversionError("corrupted-file", message);
  return new ConversionError("internal-error", message);
}
