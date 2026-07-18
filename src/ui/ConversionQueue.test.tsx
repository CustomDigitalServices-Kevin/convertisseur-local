import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "../i18n/LocaleProvider";
import { ConversionQueue } from "./ConversionQueue";
import type { WorkerInbound, WorkerOutbound } from "../core/types";

// Same technique as src/core/worker-bridge.test.ts: happy-dom has no real
// Worker, so we stub the global and drive the WorkerBridge protocol
// directly. import.meta.env.MODE is "test" here (see queue-utils.ts), so
// ConversionQueue talks to this fake worker exactly like production code
// would — the dev-only stub fallback never activates in this file.
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

const PDF_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34];

function pdfFile(name = "input.pdf"): File {
  return new File([new Uint8Array(PDF_BYTES)], name, { type: "application/pdf" });
}

function firstJobId(worker: FakeWorker): string {
  const message = worker.sent[0];
  if (message === undefined || message.kind !== "convert") {
    throw new Error("expected a convert message to have been sent");
  }
  return message.request.jobId;
}

afterEach(() => {
  FakeWorker.instances = [];
  vi.unstubAllGlobals();
});

async function renderWithFile(file: File): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  render(
    <LocaleProvider>
      <ConversionQueue />
    </LocaleProvider>,
  );
  const input = screen.getByLabelText("Browse your files");
  await user.upload(input, file);
  await screen.findByText(file.name);
  return user;
}

describe("ConversionQueue", () => {
  it("converts a file end to end and exposes a download button on success", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const user = await renderWithFile(pdfFile());

    await user.selectOptions(screen.getByLabelText("Convert to"), "png");
    await user.click(screen.getByRole("button", { name: "Convert all" }));

    const worker = FakeWorker.instances[0];
    if (worker === undefined) throw new Error("worker not created");
    const jobId = firstJobId(worker);

    worker.emit({ kind: "progress", jobId, percent: 50 });
    await screen.findByText("Converting");

    worker.emit({
      kind: "success",
      result: {
        jobId,
        files: [{ name: "input.png", mimeType: "image/png", data: new ArrayBuffer(4) }],
        fidelity: "high",
        durationMs: 42,
      },
    });

    expect(await screen.findByText("Done")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
  });

  it("shows a fidelity badge for a medium-fidelity result", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const user = await renderWithFile(pdfFile("report.pdf"));

    // The worker reports fidelity independently of the pair — this
    // exercises the UI badge, not the specific xlsx->pdf fidelity rule
    // (that rule lives in the converter modules, tasks 3-5, not this UI).
    await user.selectOptions(screen.getByLabelText("Convert to"), "png");
    await user.click(screen.getByRole("button", { name: "Convert all" }));

    const worker = FakeWorker.instances[0];
    if (worker === undefined) throw new Error("worker not created");
    const jobId = firstJobId(worker);

    worker.emit({
      kind: "success",
      result: {
        jobId,
        files: [{ name: "out.png", mimeType: "image/png", data: new ArrayBuffer(4) }],
        fidelity: "medium",
        durationMs: 10,
      },
    });

    expect(await screen.findByText("Medium fidelity")).toBeInTheDocument();
  });

  it("shows the localized error message when the worker reports unsupported-conversion", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const user = await renderWithFile(pdfFile("other.pdf"));

    await user.selectOptions(screen.getByLabelText("Convert to"), "jpeg");
    await user.click(screen.getByRole("button", { name: "Convert all" }));

    const worker = FakeWorker.instances[0];
    if (worker === undefined) throw new Error("worker not created");
    const jobId = firstJobId(worker);

    worker.emit({
      kind: "failure",
      failure: { jobId, code: "unsupported-conversion", detail: "no module registered" },
    });

    expect(await screen.findByText("This conversion is not supported.")).toBeInTheDocument();
  });

  it("shows the unrecognized-format message for content with no known signature", async () => {
    render(
      <LocaleProvider>
        <ConversionQueue />
      </LocaleProvider>,
    );
    const user = userEvent.setup();
    const input = screen.getByLabelText("Browse your files");
    const mystery = new File([new Uint8Array([0x00, 0x01, 0x02])], "mystery.bin");
    await user.upload(input, mystery);

    expect(await screen.findByText("Unrecognized file format.")).toBeInTheDocument();
  });

  it("marks a queued job as cancelled after Cancel all", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const user = await renderWithFile(pdfFile("third.pdf"));

    await user.selectOptions(screen.getByLabelText("Convert to"), "png");
    await user.click(screen.getByRole("button", { name: "Convert all" }));
    await screen.findByText("Queued");

    await user.click(screen.getByRole("button", { name: "Cancel all" }));

    expect(await screen.findByText("Cancelled")).toBeInTheDocument();
  });
});
