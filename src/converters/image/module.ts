import type { ConverterModule } from "../../core/converter-module";
import type { ConversionOutputFile } from "../../core/types";
import { ConversionError } from "../../core/types";
import { decodeAvif, encodeAvif } from "./avif";
import {
  canvasToImageData,
  canvasToRasterBlob,
  decodeRasterToCanvas,
  imageDataToCanvas,
} from "./canvas";
import { clampQuality, mimeTypeFor, withExtension } from "./mime";
import type { ImageFormat, ImageOutputFormat } from "./mime";
import { svgToPng } from "./svg";

/** Applied when the request carries no explicit `options.quality`. */
const DEFAULT_QUALITY = 0.92;

export const imageModule: ConverterModule = {
  async convert(request, reportProgress) {
    const sourceFormat = assertImageFormat(request.sourceFormat);
    const targetFormat = assertImageFormat(request.targetFormat);

    if (sourceFormat === "svg") {
      if (targetFormat !== "png") {
        throw new ConversionError(
          "unsupported-conversion",
          `svg can only be converted to png, got "${targetFormat}"`,
        );
      }
      reportProgress(20);
      const png = await svgToPng(request.data, request.options.width);
      reportProgress(100);
      return { files: [buildOutputFile(request.fileName, "png", png)], fidelity: "high" };
    }

    if (targetFormat === "svg") {
      throw new ConversionError("unsupported-conversion", "svg is not a supported output format");
    }

    const quality = clampQuality(request.options.quality ?? DEFAULT_QUALITY);

    reportProgress(10);
    const canvas =
      sourceFormat === "avif"
        ? imageDataToCanvas(await decodeAvif(request.data))
        : await decodeRasterToCanvas(request.data, mimeTypeFor(sourceFormat));
    reportProgress(50);

    const outputData =
      targetFormat === "avif"
        ? await encodeAvif(canvasToImageData(canvas), quality)
        : await canvasToRasterBlob(
            canvas,
            mimeTypeFor(targetFormat),
            targetFormat === "png" ? undefined : quality,
          );
    reportProgress(100);

    return {
      files: [buildOutputFile(request.fileName, targetFormat, outputData)],
      fidelity: "high",
    };
  },
};

/**
 * Narrows the wider `FileFormat` union to the 5 formats this module handles.
 * Unreachable via any legitimate call: `registry.ts` only ever routes
 * `module: "image"` entries here, and every one of them has source/target
 * within this set (T2 core contract). Kept as defense-in-depth and to give
 * TypeScript a concrete type to narrow to.
 */
function assertImageFormat(format: string): ImageFormat {
  if (format === "png" || format === "jpeg" || format === "webp" || format === "avif" || format === "svg") {
    return format;
  }
  throw new ConversionError("unsupported-conversion", `"${format}" is not an image format`);
}

function buildOutputFile(
  sourceName: string,
  targetFormat: ImageOutputFormat,
  data: ArrayBuffer,
): ConversionOutputFile {
  return {
    name: withExtension(sourceName, targetFormat),
    mimeType: mimeTypeFor(targetFormat),
    data,
  };
}
