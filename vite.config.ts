import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Strict CSP injected at build time only (the dev server needs inline
// scripts for HMR). connect-src 'self' is the technical enforcement of the
// "no upload" promise: the browser itself blocks any cross-origin request.
// style-src-attr covers the single inline style attribute (progress bar).
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self'",
  "style-src-attr 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'none'",
  "object-src 'none'",
].join("; ");

function injectCsp(): Plugin {
  return {
    name: "inject-csp",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        "<meta charset=\"UTF-8\" />",
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
      );
    },
  };
}

// Deployed under /outils/convertisseur/ on the CDS site; base must stay
// relative so the same build also works on GitHub Pages or a local preview.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    injectCsp(),
    VitePWA({
      registerType: "autoUpdate",
      // External registerSW.js file, not an inline script: keeps the strict
      // CSP (script-src 'self') intact.
      injectRegister: "script-defer",
      workbox: {
        // WASM codecs are the whole point of offline support; the Workbox
        // default cap (2 MiB) would silently exclude them (advisor 2026-07-18).
        globPatterns: ["**/*.{js,css,html,wasm,svg,png,woff2}"],
        // The multi-thread AVIF encoder variant is never used: avif.ts forces
        // the single-thread codec (no COOP/COEP on the static deployment), so
        // precaching those chunks would waste ~3.5 MB per visitor (D9).
        globIgnores: ["**/avif_enc_mt*"],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
      manifest: {
        name: "Convertisseur local",
        short_name: "Convertisseur",
        description:
          "Convert PDF, images, Word and Excel files entirely in your browser. No upload.",
        theme_color: "#3b5bdb",
        background_color: "#ffffff",
        display: "standalone",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
    }),
  ],
  build: {
    target: "es2022",
    sourcemap: false,
  },
  worker: {
    format: "es",
  },
});
