import type { ReactElement } from "react";
import { useLocale } from "../i18n/locale-context";

// Runtime dependencies only (build tooling — Vite, TypeScript, ESLint,
// Vitest, Playwright — is not bundled and is out of scope here).
// licenses-page.test.ts locks this table against package.json
// "dependencies": adding a runtime dependency without listing it here
// fails CI. `covers` maps a display row to the package names it credits.
export interface RuntimeLicenseEntry {
  name: string;
  license: string;
  covers: string[];
}

export const RUNTIME_LICENSES: readonly RuntimeLicenseEntry[] = [
  { name: "react / react-dom", license: "MIT", covers: ["react", "react-dom"] },
  { name: "fflate", license: "MIT", covers: ["fflate"] },
  { name: "pdfjs-dist", license: "Apache-2.0", covers: ["pdfjs-dist"] },
  { name: "pdf-lib", license: "MIT", covers: ["pdf-lib"] },
  { name: "@jspawn/qpdf-wasm", license: "Apache-2.0", covers: ["@jspawn/qpdf-wasm"] },
  { name: "@jsquash (AVIF)", license: "Apache-2.0", covers: ["@jsquash/avif"] },
  { name: "@resvg/resvg-wasm", license: "MPL-2.0", covers: ["@resvg/resvg-wasm"] },
  { name: "exceljs", license: "MIT", covers: ["exceljs"] },
  { name: "mammoth", license: "BSD-2-Clause", covers: ["mammoth"] },
  { name: "marked", license: "MIT", covers: ["marked"] },
  {
    name: "unified (remark / rehype / mdast / hast)",
    license: "MIT",
    covers: [
      "unified",
      "remark-parse",
      "remark-stringify",
      "remark-gfm",
      "rehype-parse",
      "rehype-remark",
      "rehype-stringify",
      "mdast-util-to-string",
      "hast-util-to-text",
    ],
  },
  { name: "docx", license: "MIT", covers: ["docx"] },
  { name: "yaml", license: "ISC", covers: ["yaml"] },
  { name: "fast-xml-parser", license: "MIT", covers: ["fast-xml-parser"] },
  { name: "utif", license: "MIT", covers: ["utif"] },
  { name: "omggif", license: "MIT", covers: ["omggif"] },
  { name: "gifenc", license: "MIT", covers: ["gifenc"] },
  { name: "bmp-js", license: "MIT", covers: ["bmp-js"] },
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
