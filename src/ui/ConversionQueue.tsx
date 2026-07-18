import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { downloadFile } from "../core/download";
import { downloadAsZip } from "../core/zip";
import { WorkerBridge } from "../core/worker-bridge";
import type { ConversionOutputFile, ConversionRequest, ConversionSuccess, FileFormat } from "../core/types";
import { useLocale } from "../i18n/locale-context";
import { Dropzone } from "./Dropzone";
import { FileQueueItem } from "./FileQueueItem";
import type { QueueItem } from "./queue-types";
import { buildQueueItem, intersect, isConversionFailure, isFileFormat, runConversion, withoutExtension } from "./queue-utils";

export function ConversionQueue(): ReactElement {
  const { t } = useLocale();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [globalTarget, setGlobalTarget] = useState<FileFormat | "">("");
  const bridgeRef = useRef<WorkerBridge | null>(null);

  const getBridge = useCallback((): WorkerBridge => {
    bridgeRef.current ??= new WorkerBridge();
    return bridgeRef.current;
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const handleFilesAdded = useCallback((files: File[]) => {
    void Promise.all(files.map((file) => buildQueueItem(file))).then((items) => {
      setQueue((prev) => [...prev, ...items]);
    });
  }, []);

  const handleTargetChange = useCallback(
    (id: string, target: FileFormat) => {
      updateItem(id, { targetFormat: target });
    },
    [updateItem],
  );

  const handleRemove = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleDownload = useCallback((item: QueueItem) => {
    if (item.resultFiles === null || item.resultFiles.length === 0) return;
    if (item.resultFiles.length === 1) {
      const [only] = item.resultFiles;
      if (only !== undefined) downloadFile(only);
      return;
    }
    downloadAsZip(item.resultFiles, `${withoutExtension(item.file.name)}.zip`);
  }, []);

  const eligibleTargetLists = useMemo(
    () =>
      queue
        .filter((item) => item.localError === null && item.availableTargets.length > 0)
        .map((item) => item.availableTargets),
    [queue],
  );
  const commonTargets = useMemo(() => intersect(eligibleTargetLists), [eligibleTargetLists]);

  const handleGlobalTargetChange = useCallback((value: string) => {
    if (value === "" || isFileFormat(value)) setGlobalTarget(value);
  }, []);

  const handleApplyToAll = useCallback(() => {
    if (globalTarget === "") return;
    setQueue((prev) =>
      prev.map((item) =>
        item.localError === null && item.availableTargets.includes(globalTarget)
          ? { ...item, targetFormat: globalTarget }
          : item,
      ),
    );
  }, [globalTarget]);

  const runOne = useCallback(
    (item: QueueItem) => {
      if (item.targetFormat === null || item.sourceFormat === null || item.sourceBuffer === null) {
        return;
      }
      const request: ConversionRequest = {
        jobId: item.id,
        sourceFormat: item.sourceFormat,
        targetFormat: item.targetFormat,
        data: item.sourceBuffer.slice(0),
        fileName: item.file.name,
        options: {},
      };
      updateItem(item.id, { status: "queued", progress: 0 });
      let sawProgress = false;
      runConversion(getBridge(), request, (percent) => {
        if (!sawProgress) {
          sawProgress = true;
          updateItem(item.id, { status: "converting", progress: percent });
          return;
        }
        updateItem(item.id, { progress: percent });
      })
        .then((result: ConversionSuccess) => {
          updateItem(item.id, {
            status: "success",
            progress: 100,
            resultFiles: result.files,
            fidelity: result.fidelity,
          });
        })
        .catch((failure: unknown) => {
          if (!isConversionFailure(failure)) {
            updateItem(item.id, { status: "error", errorCode: "internal-error" });
            return;
          }
          if (failure.code === "cancelled") {
            updateItem(item.id, { status: "cancelled" });
            return;
          }
          updateItem(item.id, { status: "error", errorCode: failure.code });
        });
    },
    [getBridge, updateItem],
  );

  const handleConvertAll = useCallback(() => {
    for (const item of queue) {
      if (item.status === "idle" && item.targetFormat !== null) {
        runOne(item);
      }
    }
  }, [queue, runOne]);

  const handleCancelAll = useCallback(() => {
    bridgeRef.current?.cancelAll();
  }, []);

  const hasConvertible = queue.some((item) => item.status === "idle" && item.targetFormat !== null);
  const hasActive = queue.some((item) => item.status === "queued" || item.status === "converting");
  const successfulOutputs = useMemo(
    () => queue.filter((item) => item.status === "success" && item.resultFiles !== null),
    [queue],
  );

  const handleDownloadAllZip = useCallback(() => {
    const allFiles: ConversionOutputFile[] = successfulOutputs.flatMap((item) => item.resultFiles ?? []);
    if (allFiles.length > 0) downloadAsZip(allFiles, "conversions.zip");
  }, [successfulOutputs]);

  return (
    <div className="flex flex-col gap-6">
      <Dropzone onFilesAdded={handleFilesAdded} />

      {queue.length === 0 ? (
        <p className="text-center text-sm text-brand-900/60">{t("queue.empty")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            {commonTargets.length > 0 && (
              <label className="flex flex-col text-xs text-brand-900/70">
                {t("queue.globalTargetLabel")}
                <select
                  className="mt-1 rounded border border-brand-500/40 px-2 py-1 text-sm"
                  value={globalTarget}
                  onChange={(event) => {
                    handleGlobalTargetChange(event.target.value);
                  }}
                >
                  <option value="" disabled>
                    {t("queue.selectTargetPlaceholder")}
                  </option>
                  {commonTargets.map((target) => (
                    <option key={target} value={target}>
                      {target.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {commonTargets.length > 0 && (
              <button
                type="button"
                className="rounded border border-brand-500/40 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                disabled={globalTarget === ""}
                onClick={handleApplyToAll}
              >
                {t("queue.applyToAll")}
              </button>
            )}
            <button
              type="button"
              className="rounded bg-brand-600 px-4 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!hasConvertible}
              onClick={handleConvertAll}
            >
              {t("queue.convertAll")}
            </button>
            <button
              type="button"
              className="rounded border border-brand-500/40 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!hasActive}
              onClick={handleCancelAll}
            >
              {t("queue.cancelAll")}
            </button>
            {successfulOutputs.length > 0 && (
              <button
                type="button"
                className="rounded border border-brand-500/40 px-3 py-1.5 text-sm"
                onClick={handleDownloadAllZip}
              >
                {t("queue.downloadAllZip")}
              </button>
            )}
          </div>

          <ul className="flex flex-col gap-3" aria-label={t("queue.title")}>
            {queue.map((item) => (
              <FileQueueItem
                key={item.id}
                item={item}
                onTargetChange={handleTargetChange}
                onRemove={handleRemove}
                onDownload={handleDownload}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
