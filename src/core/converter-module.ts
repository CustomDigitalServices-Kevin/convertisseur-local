import type { ConversionOutputFile, ConversionRequest, Fidelity } from "./types";

/**
 * Contract implemented by each converter module (pdf, image, office).
 * Modules run inside the conversion worker only — they must never be
 * imported from main-thread code, so their WASM payloads stay out of the
 * initial bundle.
 */
export interface ConverterModule {
  convert: (
    request: ConversionRequest,
    reportProgress: (percent: number) => void,
  ) => Promise<{ files: ConversionOutputFile[]; fidelity: Fidelity }>;
}
