import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { toPdfjsConversionError } from "./pdf-errors";

// pdfjs-dist ships its parsing/rendering work in a companion worker script.
// Vite resolves this to a hashed asset URL at build time; the worker this
// module runs in (convert.worker.ts) then spawns pdf.worker.mjs as a nested
// worker. If nested worker creation fails, pdfjs falls back to running
// in-thread ("fake worker") with a console warning -- degraded but correct.
// Both rasterization and merge/split import this module so the assignment
// only ever needs to happen once (module instances are cached by Vite/ESM).
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export { pdfjsLib };

/**
 * Parses a PDF far enough to know whether it opens cleanly, without
 * rendering anything. Used ahead of qpdf-wasm merge/split operations to get
 * reliable, structured `password-protected` / `corrupted-file` detection:
 * qpdf-wasm's own CLI error text goes to different, environment-dependent
 * output channels (console.warn in a real browser worker, but a direct
 * process-stderr write under Node, confirmed by direct testing) and isn't a
 * dependable signal, whereas pdfjs-dist throws typed exceptions
 * (PasswordException / InvalidPDFException) for exactly these cases.
 */
export async function assertPdfReadable(bytes: ArrayBuffer): Promise<void> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
  try {
    await loadingTask.promise;
  } catch (error) {
    throw toPdfjsConversionError(error);
  } finally {
    await loadingTask.destroy();
  }
}
