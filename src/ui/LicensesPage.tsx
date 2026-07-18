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
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("licenses.title")}</h1>
      <p className="text-brand-900/80">{t("licenses.intro")}</p>

      <div className="overflow-x-auto rounded-lg border border-brand-500/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-50">
            <tr>
              <th scope="col" className="px-4 py-2 font-semibold text-brand-900">
                {t("licenses.columnLibrary")}
              </th>
              <th scope="col" className="px-4 py-2 font-semibold text-brand-900">
                {t("licenses.columnLicense")}
              </th>
            </tr>
          </thead>
          <tbody>
            {RUNTIME_LICENSES.map((entry) => (
              <tr key={entry.name} className="border-t border-brand-500/10">
                <td className="px-4 py-2">{entry.name}</td>
                <td className="px-4 py-2">{entry.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        className="self-start rounded border border-brand-500/40 px-3 py-1.5 text-sm"
        onClick={onBack}
      >
        {t("licenses.back")}
      </button>
    </div>
  );
}
