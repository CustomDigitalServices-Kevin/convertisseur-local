export const SUPPORTED_LOCALES = ["fr", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const fr = {
  "app.title": "Convertisseur local",
  "app.tagline":
    "PDF, images, Word, Excel : convertissez vos fichiers directement dans votre navigateur.",
  "app.localBanner":
    "100% local : vos fichiers ne quittent jamais votre appareil. Aucun envoi, aucun serveur.",
  "nav.privacy": "Confidentialité et RGPD",
  "nav.licenses": "Licences tierces",
  "dropzone.hint": "Déposez vos fichiers ici ou cliquez pour parcourir",
} as const;

export type MessageKey = keyof typeof fr;

const en: Record<MessageKey, string> = {
  "app.title": "Local Converter",
  "app.tagline":
    "PDF, images, Word, Excel: convert your files directly in your browser.",
  "app.localBanner":
    "100% local: your files never leave your device. No upload, no server.",
  "nav.privacy": "Privacy & GDPR",
  "nav.licenses": "Third-party licenses",
  "dropzone.hint": "Drop your files here or click to browse",
};

export const messages: Record<Locale, Record<MessageKey, string>> = { fr, en };

export function detectLocale(): Locale {
  const candidates = typeof navigator === "undefined" ? [] : navigator.languages;
  for (const lang of candidates) {
    if (lang.toLowerCase().startsWith("fr")) return "fr";
    if (lang.toLowerCase().startsWith("en")) return "en";
  }
  return "fr";
}
