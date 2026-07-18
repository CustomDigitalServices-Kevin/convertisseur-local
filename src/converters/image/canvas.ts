import { ConversionError } from "../../core/types";

// Raster (png/jpeg/webp) decode and encode go through OffscreenCanvas, the
// native browser API for this: createImageBitmap decodes any of the three
// formats the browser understands, and convertToBlob re-encodes to any of
// them with an optional 0..1 quality. Neither API exists under Node/happy-dom
// (see the module-level comment in module.test.ts), so this file's behavior
// is verified by the E2E suite (task 7), not Vitest.

function get2dContext(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new ConversionError("internal-error", "OffscreenCanvas 2D context unavailable");
  }
  return ctx;
}

export async function decodeRasterToCanvas(
  data: ArrayBuffer,
  mimeType: string,
): Promise<OffscreenCanvas> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([data], { type: mimeType }));
  } catch (error) {
    throw new ConversionError("corrupted-file", `Image decode failed: ${String(error)}`);
  }
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = get2dContext(canvas);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas;
}

export function imageDataToCanvas(imageData: ImageData): OffscreenCanvas {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  get2dContext(canvas).putImageData(imageData, 0, 0);
  return canvas;
}

export function canvasToImageData(canvas: OffscreenCanvas): ImageData {
  return get2dContext(canvas).getImageData(0, 0, canvas.width, canvas.height);
}

export async function canvasToRasterBlob(
  canvas: OffscreenCanvas,
  mimeType: string,
  quality: number | undefined,
): Promise<ArrayBuffer> {
  try {
    const blob = await canvas.convertToBlob(
      quality === undefined ? { type: mimeType } : { type: mimeType, quality },
    );
    return await blob.arrayBuffer();
  } catch (error) {
    throw new ConversionError("internal-error", `Canvas encode failed: ${String(error)}`);
  }
}
