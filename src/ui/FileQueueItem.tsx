import type { ReactElement } from "react";
import type { ConversionErrorCode, Fidelity, FileFormat } from "../core/types";
import type { MessageKey } from "../i18n/messages";
import { useLocale } from "../i18n/locale-context";
import { formatBytes } from "./format-bytes";
import { isFileFormat } from "./queue-utils";
import type { QueueItem, QueueItemStatus } from "./queue-types";

const ERROR_MESSAGE_KEYS: Record<ConversionErrorCode, MessageKey> = {
  "unsupported-conversion": "error.unsupported-conversion",
  "corrupted-file": "error.corrupted-file",
  "password-protected": "error.password-protected",
  "file-too-large": "error.file-too-large",
  cancelled: "error.cancelled",
  "internal-error": "error.internal-error",
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
  const canPickTarget = item.localError === null && item.availableTargets.length > 0;
  const fidelityKey = item.fidelity === null ? undefined : FIDELITY_MESSAGE_KEYS[item.fidelity];

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-brand-500/20 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-brand-900" title={item.file.name}>
          {item.file.name}
        </p>
        <p className="text-sm text-brand-900/60">
          {formatBytes(item.file.size)}
          {item.sourceFormat !== null && (
            <>
              {" · "}
              {t("queue.detected")}: {item.sourceFormat.toUpperCase()}
            </>
          )}
        </p>
        <p className="mt-1 text-sm" data-testid={`status-${item.id}`}>
          {statusMessage(item, t)}
          {fidelityKey !== undefined && (
            <span className="ml-2 rounded bg-brand-600/10 px-2 py-0.5 text-xs font-semibold text-brand-600">
              {t(fidelityKey)}
            </span>
          )}
        </p>
        {(item.status === "queued" || item.status === "converting") && (
          // Native element: no inline style attribute, so the strict CSP
          // works even where style-src-attr is unsupported (Safari).
          <progress
            className="mt-2 h-1.5 w-full max-w-xs accent-brand-600"
            value={item.progress}
            max={100}
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canPickTarget && (
          <label className="flex flex-col text-xs text-brand-900/70">
            {t("queue.targetLabel")}
            <select
              className="mt-1 rounded border border-brand-500/40 px-2 py-1 text-sm"
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

        {item.status === "success" && (
          <button
            type="button"
            className="rounded bg-brand-600 px-3 py-1.5 text-sm font-medium text-white"
            onClick={() => {
              onDownload(item);
            }}
          >
            {t("queue.download")}
          </button>
        )}

        <button
          type="button"
          className="rounded border border-brand-500/40 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
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
