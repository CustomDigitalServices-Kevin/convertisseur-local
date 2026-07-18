import type { ReactElement } from "react";
import { useLocale } from "../i18n/locale-context";
import type { Locale } from "../i18n/messages";

// Minimal app shell for the T1 scaffold. The full UI (dropzone, batch queue,
// privacy/licenses pages) is delivered by task T6 on top of this structure.
export function Shell(): ReactElement {
  const { locale, setLocale, t } = useLocale();
  const nextLocale: Locale = locale === "fr" ? "en" : "fr";

  return (
    <div className="min-h-screen bg-brand-50 font-sans text-brand-900">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-6">
        <h1 className="text-2xl font-bold">{t("app.title")}</h1>
        <button
          type="button"
          className="rounded border border-brand-500 px-3 py-1 text-sm"
          onClick={() => {
            setLocale(nextLocale);
          }}
        >
          {nextLocale.toUpperCase()}
        </button>
      </header>
      <main className="mx-auto max-w-4xl px-4">
        <p className="mb-4 rounded bg-brand-500 px-4 py-3 text-white" data-testid="local-banner">
          {t("app.localBanner")}
        </p>
        <p className="text-lg">{t("app.tagline")}</p>
      </main>
    </div>
  );
}
