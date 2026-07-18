import { ConversionError } from "../core/types";
import type {
  ConversionErrorCode,
  ConversionRequest,
  WorkerInbound,
  WorkerOutbound,
} from "../core/types";
import { findEntry } from "../core/registry";
import { MODULE_LOADERS } from "./module-loaders";

// Jobs are processed strictly one at a time: conversions are CPU-bound, so
// interleaving them in a single worker would only thrash memory. Cancellation
// is handled by the bridge terminating the whole worker (the only reliable
// way to stop synchronous WASM), then respawning it.
const scope = self as unknown as Omit<Worker, "postMessage"> & {
  postMessage: (message: WorkerOutbound, transfer?: Transferable[]) => void;
};

let queue: Promise<void> = Promise.resolve();

scope.addEventListener("message", (event: MessageEvent<WorkerInbound>) => {
  const message = event.data;
  if (message.kind !== "convert") return;
  queue = queue.then(() => runJob(message.request));
});

async function runJob(request: ConversionRequest): Promise<void> {
  const startedAt = performance.now();
  try {
    const entry = findEntry(request.sourceFormat, request.targetFormat);
    if (entry === null) {
      throw new ConversionError(
        "unsupported-conversion",
        `No conversion from ${request.sourceFormat} to ${request.targetFormat}`,
      );
    }
    const loadModule = MODULE_LOADERS[entry.module];
    if (loadModule === undefined) {
      throw new ConversionError(
        "unsupported-conversion",
        `Converter module "${entry.module}" is not registered`,
      );
    }
    const module = await loadModule();
    const { files, fidelity } = await module.convert(request, (percent) => {
      scope.postMessage({ kind: "progress", jobId: request.jobId, percent });
    });
    scope.postMessage(
      {
        kind: "success",
        result: {
          jobId: request.jobId,
          files,
          fidelity,
          durationMs: performance.now() - startedAt,
        },
      },
      files.map((f) => f.data),
    );
  } catch (error) {
    const code: ConversionErrorCode =
      error instanceof ConversionError ? error.code : "internal-error";
    const detail = error instanceof Error ? error.message : String(error);
    scope.postMessage({ kind: "failure", failure: { jobId: request.jobId, code, detail } });
  }
}
