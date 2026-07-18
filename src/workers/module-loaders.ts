import type { ConverterModule } from "../core/converter-module";
import type { ConversionEntry } from "../core/registry";

// Each phase-B team registers its converter module here with a dynamic
// import so Vite code-splits one chunk (JS + WASM) per module family:
//
//   pdf: async () => (await import("../converters/pdf/module")).pdfModule,
//   image: async () => (await import("../converters/image/module")).imageModule,
//   office: async () => (await import("../converters/office/module")).officeModule,
//
// A conversion whose module has no loader fails with
// "unsupported-conversion" -- that is the real runtime behavior while a
// module is not merged yet, not a placeholder.
export const MODULE_LOADERS: Partial<
  Record<ConversionEntry["module"], () => Promise<ConverterModule>>
> = {
  pdf: async () => (await import("../converters/pdf/module")).pdfModule,
  image: async () => (await import("../converters/image/module")).imageModule,
  office: async () => (await import("../converters/office/module")).officeModule,
  markdown: async () => (await import("../converters/markdown/module")).markdownModule,
  data: async () => (await import("../converters/data/module")).dataModule,
};
