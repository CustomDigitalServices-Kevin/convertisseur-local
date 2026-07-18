export const SUPPORTED_LOCALES = ["fr", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const fr = {
  "app.title": "Convertisseur local",
  "app.tagline":
    "PDF, images, Word, Excel : convertissez vos fichiers directement dans votre navigateur.",
  "app.localBanner":
    "100% local : vos fichiers ne quittent jamais votre appareil. Aucun envoi, aucun serveur.",

  "nav.home": "Accueil",
  "nav.privacy": "Confidentialité et RGPD",
  "nav.licenses": "Licences tierces",

  "dropzone.hint": "Déposez vos fichiers ici ou cliquez pour parcourir",
  "dropzone.hintActive": "Déposez vos fichiers pour les ajouter",
  "dropzone.browseLabel": "Parcourir vos fichiers",

  "queue.title": "File de conversion",
  "queue.empty": "Aucun fichier pour le moment. Ajoutez-en un ci-dessus.",
  "queue.detected": "Format détecté",
  "queue.targetLabel": "Convertir vers",
  "queue.selectTargetPlaceholder": "Choisir un format",
  "queue.globalTargetLabel": "Format cible pour tous les fichiers",
  "queue.applyToAll": "Appliquer à tous",
  "queue.convertAll": "Convertir tout",
  "queue.cancelAll": "Tout annuler",
  "queue.remove": "Retirer",
  "queue.download": "Télécharger",
  "queue.downloadAllZip": "Tout télécharger (ZIP)",
  "queue.noTargets": "Aucune conversion disponible pour ce format",
  "queue.status.idle": "En attente d'un format cible",
  "queue.status.queued": "En file d'attente",
  "queue.status.converting": "Conversion en cours",
  "queue.status.success": "Terminé",
  "queue.status.error": "Erreur",
  "queue.status.cancelled": "Annulé",
  "queue.fidelity.preview": "Aperçu",
  "queue.fidelity.medium": "Fidélité moyenne",

  "error.unrecognizedFormat": "Format de fichier non reconnu.",
  "error.unsupported-conversion": "Cette conversion n'est pas prise en charge.",
  "error.corrupted-file": "Le fichier semble corrompu.",
  "error.password-protected": "Le fichier est protégé par mot de passe.",
  "error.file-too-large": "Le fichier est trop volumineux.",
  "error.cancelled": "Conversion annulée.",
  "error.internal-error": "Une erreur inattendue est survenue.",
  "error.gdoc-pointer":
    "Ce fichier Google (.gdoc) n'est qu'un raccourci vers le cloud : il ne contient pas le document. Ouvrez-le dans Google Docs puis exportez-le en DOCX, et déposez ce DOCX ici.",

  "privacy.title": "Confidentialité et RGPD",
  "privacy.back": "Retour à l'accueil",
  "privacy.intro.title": "Vos fichiers restent chez vous",
  "privacy.intro.body":
    "Ce convertisseur fonctionne entièrement dans votre navigateur, avec WebAssembly et les API web natives. Aucun fichier n'est jamais envoyé à un serveur, y compris le nôtre.",
  "privacy.local.title": "Conversions 100% locales",
  "privacy.local.body":
    "Chaque conversion s'exécute dans un Web Worker de votre navigateur. Le code source de l'application est chargé une seule fois, puis l'outil fonctionne hors ligne : vos documents ne transitent jamais sur le réseau.",
  "privacy.comparison.title": "Contrairement aux convertisseurs en ligne",
  "privacy.comparison.body":
    "Les convertisseurs cloud (iLovePDF, Smallpdf, CloudConvert...) téléversent vos documents sur des serveurs tiers, même s'ils annoncent les supprimer après quelques heures. Pour un document sensible (juridique, comptable, médical, RH), le fichier a tout de même quitté votre appareil, transité sur des réseaux tiers, et été stocké temporairement ailleurs. Avec ce convertisseur, ce risque n'existe pas : il n'y a rien à téléverser.",
  "privacy.data.title": "Aucune donnée personnelle collectée",
  "privacy.data.body":
    "Nous ne collectons aucune donnée personnelle, aucun identifiant, aucune adresse email. Il n'y a pas de compte utilisateur, pas de base de données, pas d'analytics tiers embarqué sur cette application.",
  "privacy.cookies.title": "Pas de cookies",
  "privacy.cookies.body":
    "Cette application ne dépose aucun cookie. Votre préférence de langue est conservée uniquement en mémoire le temps de la session.",

  "licenses.title": "Licences tierces",
  "licenses.back": "Retour à l'accueil",
  "licenses.intro":
    "Ce convertisseur est un logiciel libre publié sous licence MIT. Il s'appuie sur les bibliothèques open source suivantes, exécutées entièrement dans votre navigateur.",
  "licenses.columnLibrary": "Bibliothèque",
  "licenses.columnLicense": "Licence",

  "footer.brand": "Custom Digital Services",

  "trust.gdpr.title": "Conforme RGPD par design",
  "trust.gdpr.body":
    "Aucune donnée ne transite : la politique de sécurité (CSP) du navigateur bloque techniquement tout envoi.",
  "trust.offline.title": "Fonctionne hors ligne",
  "trust.offline.body":
    "Une fois chargés, les moteurs WebAssembly sont mis en cache : convertissez même sans connexion.",
  "trust.opensource.title": "Open source (MIT)",
  "trust.opensource.body":
    "Code source public sous licence MIT. Aucun tracker, aucun cookie, aucune inscription.",
} as const;

export type MessageKey = keyof typeof fr;

const en: Record<MessageKey, string> = {
  "app.title": "Local Converter",
  "app.tagline":
    "PDF, images, Word, Excel: convert your files directly in your browser.",
  "app.localBanner":
    "100% local: your files never leave your device. No upload, no server.",

  "nav.home": "Home",
  "nav.privacy": "Privacy & GDPR",
  "nav.licenses": "Third-party licenses",

  "dropzone.hint": "Drop your files here or click to browse",
  "dropzone.hintActive": "Drop your files to add them",
  "dropzone.browseLabel": "Browse your files",

  "queue.title": "Conversion queue",
  "queue.empty": "No files yet. Add one above.",
  "queue.detected": "Detected format",
  "queue.targetLabel": "Convert to",
  "queue.selectTargetPlaceholder": "Choose a format",
  "queue.globalTargetLabel": "Target format for all files",
  "queue.applyToAll": "Apply to all",
  "queue.convertAll": "Convert all",
  "queue.cancelAll": "Cancel all",
  "queue.remove": "Remove",
  "queue.download": "Download",
  "queue.downloadAllZip": "Download all (ZIP)",
  "queue.noTargets": "No conversion available for this format",
  "queue.status.idle": "Waiting for a target format",
  "queue.status.queued": "Queued",
  "queue.status.converting": "Converting",
  "queue.status.success": "Done",
  "queue.status.error": "Error",
  "queue.status.cancelled": "Cancelled",
  "queue.fidelity.preview": "Preview",
  "queue.fidelity.medium": "Medium fidelity",

  "error.unrecognizedFormat": "Unrecognized file format.",
  "error.unsupported-conversion": "This conversion is not supported.",
  "error.corrupted-file": "The file appears to be corrupted.",
  "error.password-protected": "The file is password-protected.",
  "error.file-too-large": "The file is too large.",
  "error.cancelled": "Conversion cancelled.",
  "error.internal-error": "An unexpected error occurred.",
  "error.gdoc-pointer":
    "This Google file (.gdoc) is only a shortcut to the cloud: it does not contain the document. Open it in Google Docs, export it as DOCX, and drop that DOCX here.",

  "privacy.title": "Privacy & GDPR",
  "privacy.back": "Back to home",
  "privacy.intro.title": "Your files stay with you",
  "privacy.intro.body":
    "This converter runs entirely in your browser, using WebAssembly and native web APIs. No file is ever sent to a server, including ours.",
  "privacy.local.title": "100% local conversions",
  "privacy.local.body":
    "Every conversion runs inside a Web Worker in your browser. The application code is loaded once, then the tool works offline: your documents never travel over the network.",
  "privacy.comparison.title": "Unlike online converters",
  "privacy.comparison.body":
    "Cloud converters (iLovePDF, Smallpdf, CloudConvert...) upload your documents to third-party servers, even if they claim to delete them after a few hours. For a sensitive document (legal, accounting, medical, HR), the file still left your device, transited third-party networks, and was temporarily stored elsewhere. With this converter, that risk does not exist: there is nothing to upload.",
  "privacy.data.title": "No personal data collected",
  "privacy.data.body":
    "We collect no personal data, no identifiers, no email address. There is no user account, no database, no third-party analytics embedded in this application.",
  "privacy.cookies.title": "No cookies",
  "privacy.cookies.body":
    "This application sets no cookies. Your language preference is kept only in memory for the duration of the session.",

  "licenses.title": "Third-party licenses",
  "licenses.back": "Back to home",
  "licenses.intro":
    "This converter is free software released under the MIT license. It relies on the following open source libraries, all running entirely in your browser.",
  "licenses.columnLibrary": "Library",
  "licenses.columnLicense": "License",

  "footer.brand": "Custom Digital Services",

  "trust.gdpr.title": "GDPR-compliant by design",
  "trust.gdpr.body":
    "No data ever transits: the browser's security policy (CSP) technically blocks any upload.",
  "trust.offline.title": "Works offline",
  "trust.offline.body":
    "Once loaded, the WebAssembly engines are cached: convert even without a connection.",
  "trust.opensource.title": "Open source (MIT)",
  "trust.opensource.body":
    "Publicly available source code under the MIT license. No tracker, no cookie, no sign-up.",
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
