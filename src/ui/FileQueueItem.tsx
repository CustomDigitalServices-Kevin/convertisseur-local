import type { ReactElement } from "react";
import type { ConversionErrorCode, Fidelity, FileFormat } from "../core/types";
import type { MessageKey } from "../i18n/messages";
import { useLocale } from "../i18n/locale-context";
import { formatBytes } from "./format-bytes";
import { FAMILY_CLASSES, UNKNOWN_FAMILY_CLASSES, familyFor } from "./file-family";
import { isFileFormat } from "./queue-utils";
import type { QueueItem, QueueItemStatus } from "./queue-types";
import { CheckIcon } from "./icons";

const ERROR_MESSAGE_KEYS: Record<ConversionErrorCode, MessageKey> = {
  "unsupported-conversion": "error.unsupported-conversion",
  "corrupted-file": "error.corrupted-file",
  "password-protected": "error.password-protected",
  "file-too-large": "error.file-too-large",
  cancelled: "error.cancelled",
  "internal-error": "error.internal-error",
  "gdoc-pointer": "error.gdoc-pointer",
};

const STATUS_MESSAGE_KEYS: Record<QueueItemStatus, MessageKey> = {
  idle: "queue.status.idle",
  queued: "queue.status.queued",
  converting: "queue.status.converting",
  success: "queue.status.success",
  error: "error.internal-error",
  cancelled: "queue.status.cancelled",
};

const FIDELITY_MESSAGE_KEYS: Partial<Record<Fidelity, MessageKey>> = {
  preview: "queue.fidelity.preview",
  medium: "queue.fidelity.medium",
};

// Ring geometry matches the design spec exactly: 38x38 viewBox, r=16,
// stroke-width 3.5. strokeDasharray/strokeDashoffset below are plain SVG
// presentation attributes (not the HTML `style` attribute), so the strict
// CSP's style-src-attr directive -- unsupported in some browsers -- never
// gates them.
const RING_RADIUS = 16;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function isErrorState(item: QueueItem): boolean {
  return item.status === "error" || item.localError !== null;
}

function statusMessage(item: QueueItem, t: (key: MessageKey) => string): string {
  if (item.localError === "unrecognized-format") return t("error.unrecognizedFormat");
  if (item.localError === "no-target") return t("queue.noTargets");
  if (item.status === "error" && item.errorCode !== null) return t(ERROR_MESSAGE_KEYS[item.errorCode]);
  return t(STATUS_MESSAGE_KEYS[item.status]);
}

interface FileQueueItemProps {
  item: QueueItem;
  onTargetChange: (id: string, target: FileFormat) => void;
  onRemove: (id: string) => void;
  onDownload: (item: QueueItem) => void;
}

export function FileQueueItem({
  item,
  onTargetChange,
  onRemove,
  onDownload,
}: FileQueueItemProps): ReactElement {
  const { t } = useLocale();
  const isBusy = item.status === "queued" || item.status === "converting";
  const isRunning = isBusy;
  const canPickTarget = item.localError === null && item.availableTargets.length > 0;
  const fidelityKey = item.fidelity === null ? undefined : FIDELITY_MESSAGE_KEYS[item.fidelity];
  const family =
    item.sourceFormat === null ? UNKNOWN_FAMILY_CLASSES : FAMILY_CLASSES[familyFor(item.sourceFormat)];
  const iconLabel = item.sourceFormat === null ? "?" : item.sourceFormat.toUpperCase();
  const ringOffset = RING_CIRCUMFERENCE * (1 - item.progress / 100);
  const hasError = isErrorState(item);

  return (
    <li
      className={`flex flex-col gap-3 rounded-2xl border bg-panel p-4.5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
        hasError ? "border-red/25" : "border-line hover:border-line-strong"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl border text-[10.5px] font-extrabold tracking-wide ${family.bg} ${family.text} ${family.border}`}
          aria-hidden="true"
        >
          {iconLabel}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-txt" title={item.file.name}>
            {item.file.name}
          </p>
          <p className="mt-0.5 text-[12.5px] text-faint">
            {formatBytes(item.file.size)}
            {item.sourceFormat !== null && item.targetFormat !== null && (
              <>
                {" "}
                <span className="text-orange" aria-hidden="true">
                  &#8594;
                </span>{" "}
                {item.targetFormat.toUpperCase()}
              </>
            )}
          </p>
          <p
            className={`mt-1 flex flex-wrap items-center gap-1.5 text-[13px] font-medium ${
              hasError ? "text-red" : item.status === "success" ? "text-green" : "text-muted"
            }`}
            data-testid={`status-${item.id}`}
          >
            {item.status === "success" && <CheckIcon className="size-3" />}
            {statusMessage(item, t)}
            {fidelityKey !== undefined && (
              <span className="rounded-md border border-orange-light/25 bg-orange-light/10 px-2 py-0.5 text-[10.5px] font-bold text-orange-light">
                {t(fidelityKey)}
              </span>
            )}
          </p>
          {isRunning && (
            <progress className="mt-2 h-1.5 w-full max-w-xs accent-orange" value={item.progress} max={100} />
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {canPickTarget && (
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("queue.targetLabel")}
            <select
              className="rounded-lg border border-line-strong bg-panel-2 px-2.5 py-1.5 text-sm text-txt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:opacity-40"
              value={item.targetFormat ?? ""}
              disabled={isBusy || item.status === "success"}
              onChange={(event) => {
                const { value } = event.target;
                if (isFileFormat(value)) onTargetChange(item.id, value);
              }}
            >
              <option value="" disabled>
                {t("queue.selectTargetPlaceholder")}
              </option>
              {item.availableTargets.map((target) => (
                <option key={target} value={target}>
                  {target.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        )}

        {isRunning && (
          <span className="relative size-9.5 shrink-0" aria-hidden="true">
            <svg width="38" height="38" className="-rotate-90">
              <circle cx="19" cy="19" r={RING_RADIUS} fill="none" stroke="var(--color-line-strong)" strokeWidth="3.5" />
              <circle
                cx="19"
                cy="19"
                r={RING_RADIUS}
                fill="none"
                stroke="var(--color-orange)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[9.5px] font-bold text-muted">
              {Math.round(item.progress)}%
            </span>
          </span>
        )}

        {item.status === "success" && (
          <button
            type="button"
            className="rounded-lg border border-green/28 bg-green/10 px-3.5 py-2 text-sm font-semibold text-green transition-colors hover:bg-green/18 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
            onClick={() => {
              onDownload(item);
            }}
          >
            {t("queue.download")}
          </button>
        )}

        <button
          type="button"
          className="rounded-lg border border-line-strong px-3.5 py-2 text-sm text-muted transition-colors hover:border-faint hover:text-txt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isBusy}
          onClick={() => {
            onRemove(item.id);
          }}
        >
          {t("queue.remove")}
        </button>
      </div>
    </li>
  );
}
