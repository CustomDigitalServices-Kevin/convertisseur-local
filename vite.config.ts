import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Deployed under /outils/convertisseur/ on the CDS site; base must stay
// relative so the same build also works on GitHub Pages or a local preview.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    sourcemap: false,
  },
  worker: {
    format: "es",
  },
});
