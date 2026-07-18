import type {
  ConversionErrorCode,
  ConversionOutputFile,
  Fidelity,
  FileFormat,
} from "../core/types";

/**
 * Lifecycle of one file in the batch queue. "error" covers both real worker
 * failures (errorCode set) and local pre-conversion problems (localError
 * set) so the UI has a single status to branch on for badges/spinners.
 */
export type QueueItemStatus =
  | "idle"
  | "queued"
  | "converting"
  | "success"
  | "error"
  | "cancelled";

export type LocalQueueError = "unrecognized-format" | "no-target";

export interface QueueItem {
  id: string;
  file: File;
  /** Raw bytes read once at drop time; conversions send a fresh slice(0) copy. */
  sourceBuffer: ArrayBuffer | null;
  sourceFormat: FileFormat | null;
  targetFormat: FileFormat | null;
  availableTargets: FileFormat[];
  status: QueueItemStatus;
  progress: number;
  errorCode: ConversionErrorCode | null;
  localError: LocalQueueError | null;
  resultFiles: ConversionOutputFile[] | null;
  fidelity: Fidelity | null;
}
