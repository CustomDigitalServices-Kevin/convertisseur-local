import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "../i18n/LocaleProvider";
import { FileQueueItem } from "./FileQueueItem";
import type { QueueItem } from "./queue-types";

function baseItem(overrides: Partial<QueueItem>): QueueItem {
  return {
    id: "file-1",
    file: new File([new Uint8Array([1, 2, 3])], "export.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    sourceBuffer: new ArrayBuffer(3),
    sourceFormat: "docx",
    targetFormat: "pdf",
    availableTargets: ["pdf", "md"],
    status: "idle",
    progress: 0,
    errorCode: null,
    localError: null,
    resultFiles: null,
    fidelity: null,
    ...overrides,
  };
}

const noop = (): void => undefined;

describe("FileQueueItem", () => {
  it("shows the .gdoc explanatory message when the worker reports gdoc-pointer", () => {
    const item = baseItem({ status: "error", errorCode: "gdoc-pointer" });
    render(
      <LocaleProvider>
        <ul>
          <FileQueueItem item={item} onTargetChange={noop} onRemove={noop} onDownload={noop} />
        </ul>
      </LocaleProvider>,
    );

    expect(
      screen.getByText(
        "This Google file (.gdoc) is only a shortcut to the cloud: it does not contain the document. Open it in Google Docs, export it as DOCX, and drop that DOCX here.",
      ),
    ).toBeInTheDocument();
  });

  it("marks the status line and the card with the error accent for a gdoc-pointer item", () => {
    const item = baseItem({ status: "error", errorCode: "gdoc-pointer" });
    render(
      <LocaleProvider>
        <ul>
          <FileQueueItem item={item} onTargetChange={noop} onRemove={noop} onDownload={noop} />
        </ul>
      </LocaleProvider>,
    );

    expect(screen.getByTestId("status-file-1").className).toContain("text-red");
  });

  it("shows the success checkmark alongside the status text without duplicating it", () => {
    const item = baseItem({
      status: "success",
      resultFiles: [{ name: "export.pdf", mimeType: "application/pdf", data: new ArrayBuffer(4) }],
      fidelity: "high",
    });
    render(
      <LocaleProvider>
        <ul>
          <FileQueueItem item={item} onTargetChange={noop} onRemove={vi.fn()} onDownload={noop} />
        </ul>
      </LocaleProvider>,
    );

    expect(screen.getAllByText("Done")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
  });
});
