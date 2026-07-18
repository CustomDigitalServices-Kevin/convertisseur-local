import type { PDFPageProxy, PageViewport } from "pdfjs-dist";
import type { ConversionOutputFile, ConversionRequest, Fidelity } from "../../core/types";
import { ConversionError } from "../../core/types";
import { pdfjsLib } from "./pdfjs-runtime";
import { stripExtension, toPdfjsConversionError } from "./pdf-errors";

const DEFAULT_SCALE = 1.5;
const DEFAULT_JPEG_QUALITY = 0.92;

type RenderParameters = Parameters<PDFPageProxy["render"]>[0];

/**
 * Renders every page of a PDF to a raster image (PNG or JPEG), one output
 * file per page. Runs entirely inside the conversion worker via
 * OffscreenCanvas -- verified against the pdfjs-dist 6.1.200 runtime, which
 * feature-detects and uses OffscreenCanvas internally (see
 * node_modules/pdfjs-dist/build/pdf.mjs, `isOffscreenCanvasSupported`).
 */
export async function renderPdfToImages(
  request: ConversionRequest,
  reportProgress: (percent: number) => void,
): Promise<{ files: ConversionOutputFile[]; fidelity: Fidelity }> {
  const { data, fileName, targetFormat, options } = request;
  if (targetFormat !== "png" && targetFormat !== "jpeg") {
    throw new ConversionError(
      "unsupported-conversion",
      `pdf rasterization does not support target "${targetFormat}"`,
    );
  }
  const scale = options.scale ?? DEFAULT_SCALE;
  const quality = options.quality ?? DEFAULT_JPEG_QUALITY;
  const mimeType = targetFormat === "png" ? "image/png" : "image/jpeg";
  const extension = targetFormat === "png" ? "png" : "jpg";

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
  let doc: Awaited<typeof loadingTask.promise>;
  try {
    doc = await loadingTask.promise;
  } catch (error) {
    throw toPdfjsConversionError(error);
  }

  try {
    const baseName = stripExtension(fileName);
    const files: ConversionOutputFile[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      try {
        const arrayBuffer = await renderPage(page, scale, mimeType, targetFormat, quality);
        files.push({
          name: `${baseName}-p${String(pageNumber)}.${extension}`,
          mimeType,
          data: arrayBuffer,
        });
        reportProgress(Math.round((pageNumber / doc.numPages) * 100));
      } finally {
        page.cleanup();
      }
    }
    return { files, fidelity: "high" };
  } catch (error) {
    throw toPdfjsConversionError(error);
  } finally {
    await loadingTask.destroy();
  }
}

async function renderPage(
  page: PDFPageProxy,
  scale: number,
  mimeType: string,
  targetFormat: "png" | "jpeg",
  quality: number,
): Promise<ArrayBuffer> {
  const viewport: PageViewport = page.getViewport({ scale });
  const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new ConversionError("internal-error", "Could not acquire a 2D canvas context");
  }
  // pdfjs-dist's published types only declare `canvasContext` as
  // CanvasRenderingContext2D, but the runtime accepts and itself creates
  // OffscreenCanvasRenderingContext2D internally (both are Canvas 2D
  // drawing surfaces with the same operations pdfjs uses to paint a page).
  // This cast bridges that published-type gap; it is not a behavior change.
  const renderParameters: RenderParameters = {
    canvas: null,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  };
  await page.render(renderParameters).promise;
  const encodeOptions: ImageEncodeOptions =
    targetFormat === "jpeg" ? { type: mimeType, quality } : { type: mimeType };
  const blob = await canvas.convertToBlob(encodeOptions);
  return blob.arrayBuffer();
}
