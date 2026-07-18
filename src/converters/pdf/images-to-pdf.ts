import { PDFDocument } from "pdf-lib";
import type { PDFImage } from "pdf-lib";
import type { ConversionOutputFile, ConversionRequest, Fidelity, FileFormat } from "../../core/types";
import { ConversionError } from "../../core/types";
import { detectFormat } from "../../core/detect";
import { stripExtension } from "./pdf-errors";

interface ImageInput {
  format: FileFormat;
  bytes: ArrayBuffer;
}

/**
 * Combines one or more PNG/JPEG/WebP images into a single PDF, one page per
 * image in the order received: `request.data` first, then each entry of
 * `request.options.extraInputs` in array order. Each page is sized to match
 * its source image in pixels (1 px = 1 pt), so no upscaling/cropping occurs.
 */
export async function imagesToPdf(
  request: ConversionRequest,
  reportProgress: (percent: number) => void,
): Promise<{ files: ConversionOutputFile[]; fidelity: Fidelity }> {
  const { data, sourceFormat, fileName, options } = request;
  const inputs: ImageInput[] = [{ format: sourceFormat, bytes: data }];
  for (const extra of options.extraInputs ?? []) {
    inputs.push({ format: detectExtraImageFormat(extra), bytes: extra });
  }

  try {
    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      if (input === undefined) continue;
      const image = await embedImage(pdfDoc, input);
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
      reportProgress(Math.round(((i + 1) / inputs.length) * 100));
    }
    const pdfBytes = await pdfDoc.save();
    const baseName = stripExtension(fileName);
    return {
      files: [
        {
          name: `${baseName}.pdf`,
          mimeType: "application/pdf",
          data: toArrayBuffer(pdfBytes),
        },
      ],
      fidelity: "high",
    };
  } catch (error) {
    if (error instanceof ConversionError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new ConversionError("corrupted-file", message);
  }
}

function detectExtraImageFormat(bytes: ArrayBuffer): FileFormat {
  const format = detectFormat("", bytes);
  if (format !== "png" && format !== "jpeg" && format !== "webp") {
    throw new ConversionError(
      "corrupted-file",
      `Unrecognized image format in extraInputs (detected: ${format ?? "unknown"})`,
    );
  }
  return format;
}

async function embedImage(pdfDoc: PDFDocument, input: ImageInput): Promise<PDFImage> {
  if (input.format === "jpeg") return pdfDoc.embedJpg(input.bytes);
  if (input.format === "png") return pdfDoc.embedPng(input.bytes);
  // pdf-lib only embeds PNG/JPEG natively; decode WebP via the platform
  // image codecs (createImageBitmap + OffscreenCanvas) and re-encode as PNG.
  const pngBytes = await webpToPng(input.bytes);
  return pdfDoc.embedPng(pngBytes);
}

async function webpToPng(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/webp" }));
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new ConversionError("internal-error", "Could not acquire a 2D canvas context");
    }
    context.drawImage(bitmap, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    return await blob.arrayBuffer();
  } finally {
    bitmap.close();
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // bytes.buffer is typed ArrayBufferLike (ArrayBuffer | SharedArrayBuffer)
  // by lib.dom; ConversionOutputFile.data must be a concrete ArrayBuffer
  // (it gets Transferable-transferred out of the worker), so copy into one.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
