import type { ConverterModule } from "../../core/converter-module";
import type { ConversionOutputFile, Fidelity } from "../../core/types";
import { ConversionError } from "../../core/types";
import { renderPdfToImages } from "./pdf-to-raster";
import { imagesToPdf } from "./images-to-pdf";
import { mergeOrSplitPdf } from "./pdf-merge-split";

/**
 * PDF conversion family (task 3): PDF -> PNG/JPEG rasterization, image(s) ->
 * PDF, and PDF -> PDF merge/split/normalize. See src/core/README.md for the
 * ConverterModule contract shared by every family.
 */
export const pdfModule: ConverterModule = {
  convert(request, reportProgress): Promise<{ files: ConversionOutputFile[]; fidelity: Fidelity }> {
    const { sourceFormat, targetFormat } = request;
    if (sourceFormat === "pdf" && (targetFormat === "png" || targetFormat === "jpeg")) {
      return renderPdfToImages(request, reportProgress);
    }
    if (
      (sourceFormat === "png" || sourceFormat === "jpeg" || sourceFormat === "webp") &&
      targetFormat === "pdf"
    ) {
      return imagesToPdf(request, reportProgress);
    }
    if (sourceFormat === "pdf" && targetFormat === "pdf") {
      return mergeOrSplitPdf(request, reportProgress);
    }
    return Promise.reject(
      new ConversionError(
        "unsupported-conversion",
        `pdf module cannot convert ${sourceFormat} -> ${targetFormat}`,
      ),
    );
  },
};
