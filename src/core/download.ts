import type { ConversionOutputFile } from "./types";

/** Triggers a browser download for a single converted file. */
export function downloadFile(file: ConversionOutputFile): void {
  const blob = new Blob([file.data], { type: file.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}
