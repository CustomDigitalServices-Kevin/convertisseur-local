import { useState } from "react";
import type { ReactElement } from "react";
import { useLocale } from "../i18n/locale-context";
import type { Locale } from "../i18n/messages";
import { ConversionQueue } from "./ConversionQueue";
import { PrivacyPage } from "./PrivacyPage";
import { LicensesPage } from "./LicensesPage";

type Page = "home" | "privacy" | "licenses";

export function Shell(): ReactElement {
  const { locale, setLocale, t } = useLocale();
  const [page, setPage] = useState<Page>("home");
  const nextLocale: Locale = locale === "fr" ? "en" : "fr";

  return (
    <div className="min-h-screen bg-brand-50 font-sans text-brand-900">
      <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-6">
        <span className="text-xl font-bold">{t("app.title")}</span>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            className="rounded px-2 py-1 hover:underline"
            aria-current={page === "home" ? "page" : undefined}
            onClick={() => {
              setPage("home");
            }}
          >
            {t("nav.home")}
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 hover:underline"
            aria-current={page === "privacy" ? "page" : undefined}
            onClick={() => {
              setPage("privacy");
            }}
          >
            {t("nav.privacy")}
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 hover:underline"
            aria-current={page === "licenses" ? "page" : undefined}
            onClick={() => {
              setPage("licenses");
            }}
          >
            {t("nav.licenses")}
          </button>
        </nav>

        <button
          type="button"
          className="rounded border border-brand-500 px-3 py-1 text-sm"
          data-testid="locale-toggle"
          onClick={() => {
            setLocale(nextLocale);
          }}
        >
          {nextLocale.toUpperCase()}
        </button>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-16">
        {page === "home" && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl font-bold">{t("app.title")}</h1>
              <p className="mt-2 text-lg">{t("app.tagline")}</p>
            </div>
            <p
              className="rounded bg-brand-500 px-4 py-3 font-medium text-white"
              data-testid="local-banner"
            >
              {t("app.localBanner")}
            </p>
            <ConversionQueue />
          </div>
        )}
        {page === "privacy" && (
          <PrivacyPage
            onBack={() => {
              setPage("home");
            }}
          />
        )}
        {page === "licenses" && (
          <LicensesPage
            onBack={() => {
              setPage("home");
            }}
          />
        )}
      </main>
    </div>
  );
}
