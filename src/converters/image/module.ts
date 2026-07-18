import type { ConverterModule } from "../../core/converter-module";
import type { ConversionOutputFile } from "../../core/types";
import { ConversionError } from "../../core/types";
import { decodeAvif, encodeAvif } from "./avif";
import { decodeBmp, encodeBmp } from "./bmp";
import {
  canvasToImageData,
  canvasToRasterBlob,
  decodeRasterToCanvas,
  imageDataToCanvas,
} from "./canvas";
import { decodeGif, encodeGif } from "./gif";
import { clampQuality, mimeTypeFor, withExtension } from "./mime";
import type { ImageFormat, ImageOutputFormat } from "./mime";
import { svgToPng } from "./svg";
import { decodeTiff, encodeTiff } from "./tiff";

/** Applied when the request carries no explicit `options.quality`. */
const DEFAULT_QUALITY = 0.92;

/**
 * Every source format decodes to the same OffscreenCanvas working surface.
 * Formats with no native browser codec (avif, tiff, gif, bmp) decode to an
 * `ImageData` through a bespoke JS/WASM codec first, then join the same
 * pipeline via `imageDataToCanvas` -- see avif.ts, tiff.ts, gif.ts, bmp.ts.
 */
async function decodeSourceToCanvas(
  format: ImageFormat,
  data: ArrayBuffer,
): Promise<OffscreenCanvas> {
  switch (format) {
    case "avif":
      return imageDataToCanvas(await decodeAvif(data));
    case "tiff":
      return imageDataToCanvas(decodeTiff(data));
    case "gif":
      return imageDataToCanvas(decodeGif(data));
    case "bmp":
      return imageDataToCanvas(decodeBmp(data));
    case "svg":
      // svg is handled entirely by the caller before this function is ever
      // reached (source-only, png-only target) -- see imageModule.convert.
      throw new ConversionError("internal-error", "svg must be handled by the svg->png path");
    case "png":
    case "jpeg":
    case "webp":
      return decodeRasterToCanvas(data, mimeTypeFor(format));
  }
}

/** Mirror of `decodeSourceToCanvas` for encoding the working canvas to every target format. */
async function encodeCanvasToTarget(
  canvas: OffscreenCanvas,
  format: ImageOutputFormat,
  quality: number,
): Promise<ArrayBuffer> {
  switch (format) {
    case "avif":
      return encodeAvif(canvasToImageData(canvas), quality);
    case "tiff":
      return encodeTiff(canvasToImageData(canvas));
    case "gif":
      return encodeGif(canvasToImageData(canvas));
    case "bmp":
      return encodeBmp(canvasToImageData(canvas));
    case "png":
    case "jpeg":
    case "webp":
      return canvasToRasterBlob(canvas, mimeTypeFor(format), format === "png" ? undefined : quality);
  }
}

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
    const canvas = await decodeSourceToCanvas(sourceFormat, request.data);
    reportProgress(50);

    const outputData = await encodeCanvasToTarget(canvas, targetFormat, quality);
    reportProgress(100);

    return {
      files: [buildOutputFile(request.fileName, targetFormat, outputData)],
      fidelity: "high",
    };
  },
};

/**
 * Narrows the wider `FileFormat` union to the 8 formats this module handles.
 * Unreachable via any legitimate call: `registry.ts` only ever routes
 * `module: "image"` entries here, and every one of them has source/target
 * within this set (T2 core contract). Kept as defense-in-depth and to give
 * TypeScript a concrete type to narrow to.
 */
function assertImageFormat(format: string): ImageFormat {
  if (
    format === "png" ||
    format === "jpeg" ||
    format === "webp" ||
    format === "avif" ||
    format === "svg" ||
    format === "tiff" ||
    format === "gif" ||
    format === "bmp"
  ) {
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
