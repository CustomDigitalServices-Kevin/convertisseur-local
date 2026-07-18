import { ConversionError } from "../../core/types";

/**
 * Maps a pdfjs-dist loading/rendering failure to a stable ConversionError.
 * pdfjs throws plain objects with a `.name` discriminator rather than
 * dedicated subclasses that survive structured cloning, so matching on
 * `.name` is the documented way to tell these apart (mozilla/pdf.js
 * src/shared/util.js: PasswordException / InvalidPDFException).
 */
export function toPdfjsConversionError(error: unknown): ConversionError {
  if (error instanceof ConversionError) return error;
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  if (name === "PasswordException") {
    return new ConversionError("password-protected", message);
  }
  if (name === "InvalidPDFException") {
    return new ConversionError("corrupted-file", message);
  }
  return new ConversionError("internal-error", message);
}

export function stripExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? fileName : fileName.slice(0, dot);
}
