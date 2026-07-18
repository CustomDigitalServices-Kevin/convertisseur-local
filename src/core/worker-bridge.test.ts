import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkerBridge } from "./worker-bridge";
import type { ConversionRequest, WorkerInbound, WorkerOutbound } from "./types";

// Simulates the conversion worker: records inbound messages and lets tests
// emit outbound protocol messages. happy-dom has no real Worker, so the
// protocol itself is what we exercise here; the real worker runs in E2E.
class FakeWorker {
  static instances: FakeWorker[] = [];
  readonly sent: WorkerInbound[] = [];
  terminated = false;
  private listener: ((event: MessageEvent<WorkerOutbound>) => void) | null = null;

  constructor() {
    FakeWorker.instances.push(this);
  }

  addEventListener(_type: string, listener: (event: MessageEvent<WorkerOutbound>) => void): void {
    this.listener = listener;
  }

  postMessage(message: WorkerInbound): void {
    this.sent.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(message: WorkerOutbound): void {
    this.listener?.({ data: message } as MessageEvent<WorkerOutbound>);
  }
}

function makeRequest(jobId: string): ConversionRequest {
  return {
    jobId,
    sourceFormat: "pdf",
    targetFormat: "png",
    data: new ArrayBuffer(8),
    fileName: "test.pdf",
    options: {},
  };
}

afterEach(() => {
  FakeWorker.instances = [];
  vi.unstubAllGlobals();
});

function setup(): WorkerBridge {
  vi.stubGlobal("Worker", FakeWorker);
  return new WorkerBridge();
}

describe("WorkerBridge", () => {
  it("resolves with the result when the worker reports success", async () => {
    const bridge = setup();
    const promise = bridge.convert(makeRequest("job-1"));
    const worker = FakeWorker.instances[0];
    expect(worker?.sent[0]?.kind).toBe("convert");
    worker?.emit({
      kind: "success",
      result: { jobId: "job-1", files: [], fidelity: "high", durationMs: 5 },
    });
    await expect(promise).resolves.toMatchObject({ jobId: "job-1", fidelity: "high" });
  });

  it("rejects with the failure payload and forwards progress", async () => {
    const bridge = setup();
    const percents: number[] = [];
    const promise = bridge.convert(makeRequest("job-2"), (p) => percents.push(p));
    const worker = FakeWorker.instances[0];
    worker?.emit({ kind: "progress", jobId: "job-2", percent: 40 });
    worker?.emit({
      kind: "failure",
      failure: { jobId: "job-2", code: "corrupted-file", detail: "bad xref" },
    });
    await expect(promise).rejects.toMatchObject({ code: "corrupted-file" });
    expect(percents).toEqual([40]);
  });

  it("cancelAll terminates the worker and rejects every pending job", async () => {
    const bridge = setup();
    const p1 = bridge.convert(makeRequest("job-3"));
    const p2 = bridge.convert(makeRequest("job-4"));
    bridge.cancelAll();
    expect(FakeWorker.instances[0]?.terminated).toBe(true);
    await expect(p1).rejects.toMatchObject({ code: "cancelled" });
    await expect(p2).rejects.toMatchObject({ code: "cancelled" });
  });

  it("spawns a fresh worker after cancelAll", () => {
    const bridge = setup();
    void bridge.convert(makeRequest("job-5")).catch(() => undefined);
    bridge.cancelAll();
    void bridge.convert(makeRequest("job-6")).catch(() => undefined);
    expect(FakeWorker.instances).toHaveLength(2);
  });
});
