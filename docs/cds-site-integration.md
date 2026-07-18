# CDS site integration (page /outils/)

Turnkey content for `web-apps/cds-site/CDS/src/data/content/` (pattern: base fr/en JSON + empty regional overrides unless a divergence exists; `vignette` must belong to `TOOL_VIGNETTES` in `outils.ts` — `"doc"` fits a converter). The build of this repo is deployed under `/outils/convertisseur/` (Vite `base: "./"` makes the bundle path-agnostic).

## outils.fr.json — object to append to `tools`

```json
{
  "slug": "convertisseur",
  "title": "Convertisseur de fichiers local",
  "description": "Convertissez PDF, images, Word et Excel directement dans votre navigateur : PDF vers images, fusion et découpe de PDF, images entre formats (WebP, AVIF...), Excel vers CSV/JSON, Word vers PDF. 100% local : vos fichiers ne quittent jamais votre appareil, aucun envoi vers un serveur.",
  "toolHref": "/outils/convertisseur/",
  "cta": "Ouvrir le convertisseur",
  "vignette": "doc",
  "highlight": false,
  "docsPath": "https://github.com/CustomDigitalServices-Kevin/convertisseur-local",
  "docsCta": "Code source (MIT)"
}
```

## outils.en.json — object to append to `tools`

```json
{
  "slug": "convertisseur",
  "title": "Local file converter",
  "description": "Convert PDF, images, Word and Excel right in your browser: PDF to images, PDF merge and split, images across formats (WebP, AVIF...), Excel to CSV/JSON, Word to PDF. 100% local: your files never leave your device, nothing is ever uploaded.",
  "toolHref": "/outils/convertisseur/",
  "cta": "Open the converter",
  "vignette": "doc",
  "highlight": false,
  "docsPath": "https://github.com/CustomDigitalServices-Kevin/convertisseur-local",
  "docsCta": "Source code (MIT)"
}
```

`outils.fr-ca.override.json` and `outils.en-gb.override.json`: no regional divergence in this copy (no France-specific vocabulary, no US/GB spelling difference) — leave both overrides empty, fr-CA/en-GB inherit byte-identical content (documented case in `merge.ts`).

Also update the `meta.description` and `hero.subtitle` of both base files if desired to mention the converter; not required for the card to render (the `tools` array drives the page).

## Deployment

1. `npm run build` in this repo.
2. Copy `dist/` to the CDS site server path serving `/outils/convertisseur/` (same pattern as `/outils/devis/` and `/outils/photo-identite/`).
3. The page sets its own strict CSP via a `<meta http-equiv>` tag — no nginx header changes required. If nginx later adds a site-wide CSP header, it must not be weaker than the meta one for this path.
4. AVIF encoding intentionally uses the single-thread codec: do NOT add COOP/COEP headers expectations for this tool; it works without cross-origin isolation.
