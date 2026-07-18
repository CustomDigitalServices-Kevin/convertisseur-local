// DEV-ONLY tooling — never shipped to production.
//
// Converter modules for PDF/image/office (tasks 3-5) are not merged into
// this branch yet: src/workers/module-loaders.ts has no entries, so every
// real conversion request resolves to "unsupported-conversion" (see
// src/core/README.md, "Rule for the UI team"). That is the real runtime
// behavior, not a placeholder, and it is what src/ui/ConversionQueue.tsx
// exercises by default against the real WorkerBridge.
//
// This module lets the UI team visually verify the success path (progress,
// fidelity badges, downloads) during `npm run dev` without waiting for
// those modules. It is loaded ONLY behind
// `if (import.meta.env.MODE === "development")` via a dynamic import in
// src/ui/queue-utils.ts (runConversion) — not the more common `DEV` flag,
// because Vitest also sets `DEV` to true (see that file's comment).
// Vite/esbuild replace `import.meta.env.MODE` with the literal mode string
// at build time and dead-code-eliminate the whole branch in both
// `npm run test` and `npm run build`, including the dynamic import call,
// so this file's identifier never reaches the production bundle — verified
// by `npm run build && grep -ri "dev-stub-converter" dist/` (must be empty).
//
// Known limitation (acceptable for dev-only scaffolding): once a request
// has fallen through to this stub, WorkerBridge.cancelAll() no longer
// cancels it, because the simulated delay below is not tied to the real
// Worker. Only relevant during local development before T3-T5 land.

import { ConversionError } from "../core/types";
import type { ConversionRequest, ConversionSuccess, Fidelity } from "../core/types";
import { findEntry } from "../core/registry";

const PROGRESS_STEPS = [20, 45, 70, 90, 100];
const STEP_DELAY_MS = 120;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Mirrors src/core/README.md rule 6 (fidelity is "high" unless lossy). */
function fidelityFor(request: ConversionRequest): Fidelity {
  if (request.sourceFormat === "xlsx" && request.targetFormat === "pdf") return "medium";
  if (request.sourceFormat === "docx" && request.targetFormat === "pdf") return "preview";
  return "high";
}

function outputNameFor(request: ConversionRequest): string {
  const dot = request.fileName.lastIndexOf(".");
  const stem = dot === -1 ? request.fileName : request.fileName.slice(0, dot);
  return `${stem}.${request.targetFormat}`;
}

// Fabricated bytes, not the real conversion output. request.data has
// already been transferred (and detached) to the real worker by the time
// this stub runs, so it could not echo the source content even if it
// wanted to — this makes that explicit instead of reading a dead buffer.
function fakeOutputBytes(request: ConversionRequest): ArrayBuffer {
  const text = `Dev stub output — ${request.fileName} -> ${request.targetFormat}. Not a real conversion.`;
  return new TextEncoder().encode(text).buffer;
}

/**
 * Simulates the WorkerBridge.convert contract for pairs that exist in the
 * registry: reports progress on the same 0-100 scale, then resolves with a
 * fabricated ConversionSuccess. Pairs absent from the registry (e.g.
 * pdf -> docx, permanently out of scope per D1) still reject with the real
 * "unsupported-conversion" error — the stub never fakes support for a
 * conversion the product will never offer.
 */
export async function simulateConversion(
  request: ConversionRequest,
  onProgress?: (percent: number) => void,
): Promise<ConversionSuccess> {
  const entry = findEntry(request.sourceFormat, request.targetFormat);
  if (entry === null) {
    throw new ConversionError(
      "unsupported-conversion",
      `No conversion from ${request.sourceFormat} to ${request.targetFormat} (dev stub)`,
    );
  }
  for (const percent of PROGRESS_STEPS) {
    await delay(STEP_DELAY_MS);
    onProgress?.(percent);
  }
  return {
    jobId: request.jobId,
    files: [
      {
        name: outputNameFor(request),
        mimeType: "application/octet-stream",
        data: fakeOutputBytes(request),
      },
    ],
    fidelity: fidelityFor(request),
    durationMs: PROGRESS_STEPS.length * STEP_DELAY_MS,
  };
}
