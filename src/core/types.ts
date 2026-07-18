// Domain types shared by the conversion core, the converter modules (T3-T5)
// and the UI (T6). Keep this file dependency-free: it is imported by workers
// and by the main thread alike.

export const FILE_FORMATS = [
  "pdf",
  "png",
  "jpeg",
  "webp",
  "avif",
  "svg",
  "xlsx",
  "csv",
  "docx",
  "json",
  "html",
  "zip",
] as const;

export type FileFormat = (typeof FILE_FORMATS)[number];

/** How faithful the output is to what a native application would produce. */
export type Fidelity = "high" | "medium" | "preview";

export interface ConversionRequest {
  /** Unique id chosen by the caller, echoed back in progress/result messages. */
  jobId: string;
  sourceFormat: FileFormat;
  targetFormat: FileFormat;
  /** Raw bytes of the source file. Transferred (not copied) to the worker. */
  data: ArrayBuffer;
  fileName: string;
  options: ConversionOptions;
}

export interface ConversionOptions {
  /** 0..1 quality for lossy image targets (jpeg/webp/avif). */
  quality?: number;
  /** Render scale for PDF page rasterization (1 = 72 dpi base). */
  scale?: number;
  /** 1-based page selection for PDF split/extract; empty = all pages. */
  pages?: number[];
  /** Output dimension for vector rasterization (svg -> png). */
  width?: number;
}

export interface ConversionOutputFile {
  name: string;
  mimeType: string;
  data: ArrayBuffer;
}

export interface ConversionSuccess {
  jobId: string;
  files: ConversionOutputFile[];
  fidelity: Fidelity;
  /** Wall-clock duration of the conversion inside the worker, in ms. */
  durationMs: number;
}

export interface ConversionFailure {
  jobId: string;
  /** Stable machine-readable code; the UI maps codes to localized messages. */
  code: ConversionErrorCode;
  /** Technical detail in English for the console, never shown raw to users. */
  detail: string;
}

export type ConversionErrorCode =
  | "unsupported-conversion"
  | "corrupted-file"
  | "password-protected"
  | "file-too-large"
  | "cancelled"
  | "internal-error";

/** Messages sent from the main thread to a conversion worker. */
export type WorkerInbound =
  | { kind: "convert"; request: ConversionRequest }
  | { kind: "cancel"; jobId: string };

/** Messages sent from a conversion worker back to the main thread. */
export type WorkerOutbound =
  | { kind: "progress"; jobId: string; percent: number }
  | { kind: "success"; result: ConversionSuccess }
  | { kind: "failure"; failure: ConversionFailure };

export class ConversionError extends Error {
  readonly code: ConversionErrorCode;

  constructor(code: ConversionErrorCode, detail: string) {
    super(detail);
    this.name = "ConversionError";
    this.code = code;
  }
}
