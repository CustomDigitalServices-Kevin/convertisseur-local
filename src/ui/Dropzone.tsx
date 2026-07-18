import { useCallback, useId, useState } from "react";
import type { ChangeEvent, DragEvent, ReactElement } from "react";
import { useLocale } from "../i18n/locale-context";

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
}

export function Dropzone({ onFilesAdded }: DropzoneProps): ReactElement {
  const { t } = useLocale();
  const [isActive, setIsActive] = useState(false);
  const inputId = useId();

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsActive(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) onFilesAdded(files);
    },
    [onFilesAdded],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length > 0) onFilesAdded(files);
      event.target.value = "";
    },
    [onFilesAdded],
  );

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        isActive ? "border-brand-600 bg-brand-50" : "border-brand-500/40 bg-white"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="dropzone"
    >
      <label htmlFor={inputId} className="cursor-pointer text-base font-medium text-brand-900">
        {isActive ? t("dropzone.hintActive") : t("dropzone.hint")}
      </label>
      <input
        id={inputId}
        type="file"
        multiple
        className="sr-only"
        aria-label={t("dropzone.browseLabel")}
        onChange={handleChange}
      />
    </div>
  );
}
