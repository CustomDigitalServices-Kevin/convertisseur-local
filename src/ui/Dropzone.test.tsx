import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "../i18n/LocaleProvider";
import { Dropzone } from "./Dropzone";

function textFile(name: string, content = "hello"): File {
  return new File([content], name, { type: "text/plain" });
}

describe("Dropzone", () => {
  it("calls onFilesAdded with the dropped files (simulated DataTransfer)", () => {
    const onFilesAdded = vi.fn();
    render(
      <LocaleProvider>
        <Dropzone onFilesAdded={onFilesAdded} />
      </LocaleProvider>,
    );
    const zone = screen.getByTestId("dropzone");
    const files = [textFile("a.csv"), textFile("b.csv")];
    fireEvent.drop(zone, { dataTransfer: { files } });
    expect(onFilesAdded).toHaveBeenCalledWith(files);
  });

  it("ignores a drop with no files", () => {
    const onFilesAdded = vi.fn();
    render(
      <LocaleProvider>
        <Dropzone onFilesAdded={onFilesAdded} />
      </LocaleProvider>,
    );
    fireEvent.drop(screen.getByTestId("dropzone"), { dataTransfer: { files: [] } });
    expect(onFilesAdded).not.toHaveBeenCalled();
  });

  it("calls onFilesAdded when a file is chosen via the input", async () => {
    const onFilesAdded = vi.fn();
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <Dropzone onFilesAdded={onFilesAdded} />
      </LocaleProvider>,
    );
    const input = screen.getByLabelText("Browse your files");
    const file = textFile("report.csv");
    await user.upload(input, file);
    expect(onFilesAdded).toHaveBeenCalledWith([file]);
  });

  it("shows the active hint while dragging over", () => {
    render(
      <LocaleProvider>
        <Dropzone onFilesAdded={vi.fn()} />
      </LocaleProvider>,
    );
    const zone = screen.getByTestId("dropzone");
    fireEvent.dragOver(zone);
    expect(screen.getByText("Drop your files to add them")).toBeInTheDocument();
    fireEvent.dragLeave(zone);
    expect(screen.getByText("Drop your files here or click to browse")).toBeInTheDocument();
  });
});
