import type {
  ConversionFailure,
  ConversionRequest,
  ConversionSuccess,
  WorkerInbound,
  WorkerOutbound,
} from "./types";

interface PendingJob {
  resolve: (result: ConversionSuccess) => void;
  reject: (failure: ConversionFailure) => void;
  onProgress?: ((percent: number) => void) | undefined;
}

/**
 * Main-thread facade over the conversion worker. One persistent worker
 * processes jobs sequentially; `cancelAll` terminates it (the only reliable
 * way to stop running WASM) and rejects every pending job with "cancelled".
 */
export class WorkerBridge {
  private worker: Worker | null = null;
  private readonly pending = new Map<string, PendingJob>();

  private ensureWorker(): Worker {
    if (this.worker !== null) return this.worker;
    const worker = new Worker(new URL("../workers/convert.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.addEventListener("message", (event: MessageEvent<WorkerOutbound>) => {
      this.handleMessage(event.data);
    });
    this.worker = worker;
    return worker;
  }

  private handleMessage(message: WorkerOutbound): void {
    switch (message.kind) {
      case "progress": {
        this.pending.get(message.jobId)?.onProgress?.(message.percent);
        return;
      }
      case "success": {
        const job = this.pending.get(message.result.jobId);
        this.pending.delete(message.result.jobId);
        job?.resolve(message.result);
        return;
      }
      case "failure": {
        const job = this.pending.get(message.failure.jobId);
        this.pending.delete(message.failure.jobId);
        job?.reject(message.failure);
        return;
      }
    }
  }

  convert(
    request: ConversionRequest,
    onProgress?: (percent: number) => void,
  ): Promise<ConversionSuccess> {
    const worker = this.ensureWorker();
    return new Promise<ConversionSuccess>((resolve, reject) => {
      this.pending.set(request.jobId, { resolve, reject, onProgress });
      const message: WorkerInbound = { kind: "convert", request };
      worker.postMessage(message, [request.data]);
    });
  }

  cancelAll(): void {
    if (this.worker !== null) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const [jobId, job] of this.pending) {
      job.reject({ jobId, code: "cancelled", detail: "Cancelled by user" });
    }
    this.pending.clear();
  }
}
