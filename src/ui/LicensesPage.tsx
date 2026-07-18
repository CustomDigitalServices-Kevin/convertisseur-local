import type { ReactElement } from "react";
import { useLocale } from "../i18n/locale-context";

// Runtime dependencies only (build tooling — Vite, TypeScript, ESLint,
// Vitest, Playwright — is not bundled and is out of scope here). Kept in
// sync with package.json "dependencies" plus the WASM codecs pulled in by
// the converter modules (T3-T5); see scripts/check-licenses.mjs for the
// automated allowlist gate that enforces this at CI time.
const RUNTIME_LICENSES: ReadonlyArray<{ name: string; license: string }> = [
  { name: "react / react-dom", license: "MIT" },
  { name: "fflate", license: "MIT" },
  { name: "pdfjs-dist", license: "Apache-2.0" },
  { name: "pdf-lib", license: "MIT" },
  { name: "@jspawn/qpdf-wasm", license: "Apache-2.0" },
  { name: "@jsquash", license: "Apache-2.0" },
  { name: "@resvg/resvg-wasm", license: "MPL-2.0" },
  { name: "exceljs", license: "MIT" },
  { name: "mammoth", license: "BSD-2-Clause" },
];

interface LicensesPageProps {
  onBack: () => void;
}

export function LicensesPage({ onBack }: LicensesPageProps): ReactElement {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-6 pt-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-txt">{t("licenses.title")}</h1>
      <p className="text-[14.5px] text-muted">{t("licenses.intro")}</p>

      <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel-2">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-semibold text-txt">
                {t("licenses.columnLibrary")}
              </th>
              <th scope="col" className="px-4 py-2.5 font-semibold text-txt">
                {t("licenses.columnLicense")}
              </th>
            </tr>
          </thead>
          <tbody>
            {RUNTIME_LICENSES.map((entry) => (
              <tr key={entry.name} className="border-t border-line">
                <td className="px-4 py-2.5 text-muted">{entry.name}</td>
                <td className="px-4 py-2.5 text-muted">{entry.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="self-start rounded-xl border border-line-strong px-4 py-2 text-sm font-semibold text-muted transition-colors hover:border-faint hover:text-txt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
        onClick={onBack}
      >
        {t("licenses.back")}
      </button>
    </div>
  );
}
