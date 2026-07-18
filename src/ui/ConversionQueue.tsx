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

const GHOST_BUTTON =
  "rounded-xl border border-line-strong px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-faint hover:text-txt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:cursor-not-allowed disabled:opacity-40";

const PRIMARY_BUTTON =
  "rounded-xl bg-linear-to-br from-orange to-orange-mid px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_26px_-12px_rgba(255,107,0,0.55)] transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-40";

const SELECT_CLASSES =
  "mt-1 rounded-lg border border-line-strong bg-panel-2 px-2.5 py-1.5 text-sm text-txt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange";

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
    <div className="flex flex-col gap-8">
      <Dropzone onFilesAdded={handleFilesAdded} />

      {queue.length === 0 ? (
        <p className="text-center text-sm text-faint">{t("queue.empty")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold tracking-tight text-txt">{t("queue.title")}</h2>
            <div className="flex flex-wrap items-end gap-3">
              {commonTargets.length > 0 && (
                <label className="flex flex-col text-xs text-muted">
                  {t("queue.globalTargetLabel")}
                  <select
                    className={SELECT_CLASSES}
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
                <button type="button" className={GHOST_BUTTON} disabled={globalTarget === ""} onClick={handleApplyToAll}>
                  {t("queue.applyToAll")}
                </button>
              )}
              <button type="button" className={PRIMARY_BUTTON} disabled={!hasConvertible} onClick={handleConvertAll}>
                {t("queue.convertAll")}
              </button>
              <button type="button" className={GHOST_BUTTON} disabled={!hasActive} onClick={handleCancelAll}>
                {t("queue.cancelAll")}
              </button>
              {successfulOutputs.length > 0 && (
                <button type="button" className={GHOST_BUTTON} onClick={handleDownloadAllZip}>
                  {t("queue.downloadAllZip")}
                </button>
              )}
            </div>
          </div>

          <ul className="flex flex-col gap-2.5" aria-label={t("queue.title")}>
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
