import { detectFormat } from "../core/detect";
import { targetsFor } from "../core/registry";
import { WorkerBridge } from "../core/worker-bridge";
import { FILE_FORMATS } from "../core/types";
import type {
  ConversionFailure,
  ConversionRequest,
  ConversionSuccess,
  FileFormat,
} from "../core/types";
import type { QueueItem } from "./queue-types";

let idCounter = 0;
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${String(idCounter)}`;
}

export function withoutExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? name : name.slice(0, dot);
}

/** Narrows a raw <select> value against the closed FileFormat union. */
export function isFileFormat(value: string): value is FileFormat {
  return (FILE_FORMATS as readonly string[]).includes(value);
}

/** Narrows a caught Promise rejection against the WorkerBridge contract. */
export function isConversionFailure(value: unknown): value is ConversionFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "jobId" in value &&
    "code" in value &&
    "detail" in value
  );
}

/** Targets common to every list; [] if any list is empty or lists is empty. */
export function intersect(lists: FileFormat[][]): FileFormat[] {
  if (lists.length === 0) return [];
  const [first, ...rest] = lists;
  if (first === undefined) return [];
  return first.filter((format) => rest.every((list) => list.includes(format)));
}

/** Reads a dropped File, detects its format and resolves its possible targets. */
export async function buildQueueItem(file: File): Promise<QueueItem> {
  const buffer = await file.arrayBuffer();
  const sourceFormat = detectFormat(file.name, buffer);
  if (sourceFormat === null) {
    return {
      id: nextId("file"),
      file,
      sourceBuffer: null,
      sourceFormat: null,
      targetFormat: null,
      availableTargets: [],
      status: "error",
      progress: 0,
      errorCode: null,
      localError: "unrecognized-format",
      resultFiles: null,
      fidelity: null,
    };
  }
  const availableTargets = targetsFor(sourceFormat);
  return {
    id: nextId("file"),
    file,
    sourceBuffer: buffer,
    sourceFormat,
    targetFormat: null,
    availableTargets,
    status: availableTargets.length === 0 ? "error" : "idle",
    progress: 0,
    errorCode: null,
    localError: availableTargets.length === 0 ? "no-target" : null,
    resultFiles: null,
    fidelity: null,
  };
}

/**
 * Runs one conversion against the real WorkerBridge. In the Vite dev server
 * only, a request that the real bridge rejects with "unsupported-conversion"
 * (the expected behavior while T3-T5 converter modules are not merged into
 * this branch — see src/core/README.md) falls through to the dev stub so
 * the success/fidelity UI states stay reviewable locally. See
 * src/dev/dev-stub-converter.ts for the full rationale.
 *
 * Gated on `MODE === "development"` rather than the more common `DEV`
 * flag: Vitest also sets `DEV` to true (its MODE is "test", and DEV is
 * simply `MODE !== "production"`), which would make automated tests hit
 * the simulated success path instead of exercising the real
 * unsupported-conversion error UI. "development" is only true for
 * `npm run dev`, so this stays dead code (and DCE-eliminated) in both
 * `npm run test` and production builds.
 */
export async function runConversion(
  bridge: WorkerBridge,
  request: ConversionRequest,
  onProgress: (percent: number) => void,
): Promise<ConversionSuccess> {
  try {
    return await bridge.convert(request, onProgress);
  } catch (failure) {
    if (
      import.meta.env.MODE === "development" &&
      isConversionFailure(failure) &&
      failure.code === "unsupported-conversion"
    ) {
      const { simulateConversion } = await import("../dev/dev-stub-converter");
      return simulateConversion(request, onProgress);
    }
    throw failure;
  }
}
