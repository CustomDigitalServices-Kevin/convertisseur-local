import type { ReactElement } from "react";
import { useLocale } from "../i18n/locale-context";

interface PrivacyPageProps {
  onBack: () => void;
}

export function PrivacyPage({ onBack }: PrivacyPageProps): ReactElement {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("privacy.title")}</h1>

      <section>
        <h2 className="text-lg font-semibold text-brand-900">{t("privacy.intro.title")}</h2>
        <p className="mt-1 text-brand-900/80">{t("privacy.intro.body")}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-brand-900">{t("privacy.local.title")}</h2>
        <p className="mt-1 text-brand-900/80">{t("privacy.local.body")}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-brand-900">{t("privacy.comparison.title")}</h2>
        <p className="mt-1 text-brand-900/80">{t("privacy.comparison.body")}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-brand-900">{t("privacy.data.title")}</h2>
        <p className="mt-1 text-brand-900/80">{t("privacy.data.body")}</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-brand-900">{t("privacy.cookies.title")}</h2>
        <p className="mt-1 text-brand-900/80">{t("privacy.cookies.body")}</p>
      </section>

      <button
        type="button"
        className="self-start rounded border border-brand-500/40 px-3 py-1.5 text-sm"
        onClick={onBack}
      >
        {t("privacy.back")}
      </button>
    </div>
  );
}
