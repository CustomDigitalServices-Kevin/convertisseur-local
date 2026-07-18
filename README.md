# Convertisseur local

Universal file converter that runs **100% in your browser**: PDF, images, Word, Excel. Your files never leave your device. No upload, no server, no account. GDPR-friendly by design.

Un convertisseur de fichiers universel qui fonctionne **100% dans votre navigateur** : PDF, images, Word, Excel. Vos fichiers ne quittent jamais votre appareil. Aucun envoi, aucun serveur, aucun compte.

## Why / Pourquoi

Cloud converters (iLovePDF, Smallpdf, CloudConvert...) upload your documents to third-party servers, even if they delete them after a few hours. For sensitive documents (legal, accounting, health, HR), the file has still left your device, transited networks and been stored by a third party. This tool performs every conversion locally with WebAssembly and browser APIs: nothing is ever sent anywhere.

## Conversions (v1)

| From | To |
|---|---|
| PDF | PNG / JPG (per page), merge, split |
| PNG / JPG / WebP / AVIF / SVG | PNG / JPG / WebP / AVIF, PDF |
| XLSX | CSV / JSON / HTML / PDF (labeled medium fidelity) |
| CSV | XLSX |
| DOCX | PDF (labeled preview fidelity) |

Deliberately out of scope: PDF to DOCX (no viable open source WASM library exists), real PDF compression (Ghostscript/MuPDF are AGPL), HEIC (HEVC patents), video and audio.

## Tech

- Vite + React 19 + TypeScript strict + Tailwind CSS v4, fully static, no backend
- Every conversion runs in a Web Worker; WASM codecs are lazy-loaded per conversion
- PWA: works offline after the first load
- Strict CSP with no external `connect-src`: the "no upload" claim is technically enforced

## Development

```bash
npm install
npm run dev          # dev server
npm run test         # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run check:licenses  # dependency license allowlist (no AGPL/LGPL)
```

## License

MIT. Dependency policy: only MIT / Apache-2.0 / BSD / MPL-2.0 (and equivalent permissive) licenses are allowed, enforced by `npm run check:licenses` in CI. See the third-party licenses page in the app for attributions.

Made by [Custom Digital Services](https://custom-digital-services.fr) — more free tools at [custom-digital-services.fr/outils](https://custom-digital-services.fr/outils/).
