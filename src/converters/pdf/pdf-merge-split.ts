import initQpdf from "@jspawn/qpdf-wasm/qpdf.mjs";
import qpdfWasmUrl from "@jspawn/qpdf-wasm/qpdf.wasm?url";
import type { ConversionOutputFile, ConversionRequest, Fidelity } from "../../core/types";
import { ConversionError } from "../../core/types";
import { assertPdfReadable } from "./pdfjs-runtime";
import { stripExtension } from "./pdf-errors";

/** Whole-document qpdf page range: page 1 through "z" (qpdf's shorthand for the last page). */
const ALL_PAGES = "1-z";

/**
 * Splits, merges, or normalizes PDFs via qpdf-wasm (the qpdf CLI compiled to
 * WASM). Which operation runs is decided by the request, matching the
 * pdf -> pdf registry entry's documented convention:
 *   - `options.pages` non-empty  -> extract those 1-based pages from the
 *     primary file (split).
 *   - `options.pages` empty and `options.extraInputs` non-empty -> merge the
 *     primary file with each extra file, in order (whole documents).
 *   - neither -> rewrite the single primary PDF through qpdf unchanged
 *     (normalizes the file; this is what a bare `qpdf in.pdf -- out.pdf`
 *     does).
 *
 * Password/corruption detection is delegated to pdfjs-dist ahead of time
 * (see pdfjs-runtime.ts) because qpdf-wasm's own CLI error text is not a
 * dependable signal across environments.
 */
export async function mergeOrSplitPdf(
  request: ConversionRequest,
  reportProgress: (percent: number) => void,
): Promise<{ files: ConversionOutputFile[]; fidelity: Fidelity }> {
  const { data, fileName, options } = request;
  const pages = options.pages ?? [];
  const extraInputs = options.extraInputs ?? [];

  await assertPdfReadable(data);
  for (const extra of extraInputs) {
    await assertPdfReadable(extra);
  }
  reportProgress(20);

  const qpdf = await initQpdf({
    locateFile: (path) => (path.endsWith(".wasm") ? qpdfWasmUrl : path),
  });
  reportProgress(35);

  qpdf.FS.writeFile("/input.pdf", new Uint8Array(data));
  const args = buildQpdfArgs(qpdf, pages, extraInputs);
  reportProgress(50);

  const exitCode = qpdf.callMain(args);
  reportProgress(90);

  // qpdf exit codes: 0 = success, 3 = success with warnings, 2 = errors (the
  // file was not processed). https://qpdf.readthedocs.io/en/stable/cli.html
  // pdfjs already screened for the two discriminated failure modes this
  // module reports (password-protected, corrupted-file); anything qpdf
  // itself still rejects at this point is treated as corrupted-file too.
  if (exitCode !== 0 && exitCode !== 3) {
    throw new ConversionError("corrupted-file", `qpdf exited with code ${String(exitCode)}`);
  }

  const outputBytes = qpdf.FS.readFile("/output.pdf");
  if (outputBytes.length === 0) {
    throw new ConversionError("corrupted-file", "qpdf produced an empty output file");
  }

  const baseName = stripExtension(fileName);
  reportProgress(100);
  return {
    files: [
      {
        name: `${baseName}.pdf`,
        mimeType: "application/pdf",
        data: toArrayBuffer(outputBytes),
      },
    ],
    fidelity: "high",
  };
}

export function buildQpdfArgs(
  qpdf: Awaited<ReturnType<typeof initQpdf>>,
  pages: number[],
  extraInputs: ArrayBuffer[],
): string[] {
  if (pages.length > 0) {
    // Split/extract: "." refers back to the primary input file itself.
    return ["/input.pdf", "--pages", ".", pages.join(","), "--", "/output.pdf"];
  }
  if (extraInputs.length > 0) {
    // Merge: concatenate the primary file with each extra file, in order.
    // An explicit page range is required per file -- omitting it (relying
    // on "all pages" as the implicit default) was verified to make this
    // qpdf 11.0.0 build reject the command with "unexpected character".
    const args = ["--empty", "--pages", "/input.pdf", ALL_PAGES];
    extraInputs.forEach((extra, index) => {
      const path = `/extra${String(index)}.pdf`;
      qpdf.FS.writeFile(path, new Uint8Array(extra));
      args.push(path, ALL_PAGES);
    });
    args.push("--", "/output.pdf");
    return args;
  }
  // Single PDF, no page selection: rewrite/normalize it through qpdf.
  return ["/input.pdf", "--", "/output.pdf"];
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // bytes.buffer is typed ArrayBufferLike (ArrayBuffer | SharedArrayBuffer)
  // by lib.dom; ConversionOutputFile.data must be a concrete ArrayBuffer
  // (it gets Transferable-transferred out of the worker), so copy into one.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
