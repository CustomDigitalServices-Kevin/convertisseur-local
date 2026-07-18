import { zipSync } from "fflate";
import type { ConversionOutputFile } from "./types";
import { downloadFile } from "./download";

// STORE (level 0): converted outputs (PNG, PDF, XLSX...) are already
// compressed, deflating them again wastes CPU for ~0% gain. At level 0
// zipSync is a structured memory copy, fast enough on the main thread even
// for lots of tens of MB, which keeps a whole zip-worker out of the design.
export function createZip(files: ConversionOutputFile[]): ArrayBuffer {
  const entries: Record<string, Uint8Array> = {};
  const seen = new Set<string>();
  for (const file of files) {
    // Zip entries must be unique; batches can produce name collisions.
    let name = file.name;
    let counter = 1;
    while (seen.has(name)) {
      const dot = file.name.lastIndexOf(".");
      name =
        dot === -1
          ? `${file.name} (${String(counter)})`
          : `${file.name.slice(0, dot)} (${String(counter)})${file.name.slice(dot)}`;
      counter += 1;
    }
    seen.add(name);
    entries[name] = new Uint8Array(file.data);
  }
  const zipped = zipSync(entries, { level: 0 });
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength);
}

export function downloadAsZip(files: ConversionOutputFile[], zipName: string): void {
  downloadFile({ name: zipName, mimeType: "application/zip", data: createZip(files) });
}
