import { describe, expect, it } from "vitest";
import type { ConversionRequest } from "../../core/types";
import { imageModule } from "./module";
import { JPEG_1X1, PNG_2X2 } from "../../../tests/fixtures/raster-fixtures";

// This file covers imageModule.convert's dispatch and guard logic only:
// the "svg -> non-png" and "any -> svg" unsupported-conversion checks run
// and throw before any OffscreenCanvas/WASM work happens, so they are
// genuinely testable under Node/happy-dom. Every other path (raster<->raster
// via OffscreenCanvas in canvas.ts, and the svg->png success path, which
// goes through svg.ts's *browser* Vite-asset WASM init rather than the
// injectable one svg.test.ts uses directly) needs a real browser and is
// covered by the E2E suite (task 7) instead. See canvas.ts's module-level
// comment and svg.test.ts's comment for the full reasoning.
//
// tiff/gif/bmp (added later, T11) follow the exact same reasoning: their
// decode/encode functions are pure JS/WASM (covered directly in
// tiff.test.ts, gif.test.ts, bmp.test.ts) but the full module.ts dispatch
// still needs a real OffscreenCanvas via imageDataToCanvas/canvasToImageData,
// so that combined path is deferred to the E2E suite here too.
//
// assertImageFormat's "not an image format" branch is intentionally not
// exercised here either: ConversionRequest.sourceFormat/targetFormat are
// typed as the full FileFormat union, and registry.ts only ever routes
// module: "image" entries with source/target already inside the 5-format
// image subset, so hitting that branch would require deliberately
// bypassing the type system with a cast — not a real, reachable path.

function baseRequest(overrides: Partial<ConversionRequest>): ConversionRequest {
  return {
    jobId: "job-1",
    sourceFormat: "png",
    targetFormat: "jpeg",
    data: PNG_2X2,
    fileName: "photo.png",
    options: {},
    ...overrides,
  };
}

describe("imageModule.convert dispatch guards", () => {
  it("rejects svg source targeting anything other than png", async () => {
    const request = baseRequest({ sourceFormat: "svg", targetFormat: "jpeg", fileName: "icon.svg" });
    await expect(imageModule.convert(request, () => {})).rejects.toMatchObject({
      code: "unsupported-conversion",
    });
  });

  it("rejects any source targeting svg", async () => {
    const request = baseRequest({ sourceFormat: "jpeg", targetFormat: "svg", data: JPEG_1X1 });
    await expect(imageModule.convert(request, () => {})).rejects.toMatchObject({
      code: "unsupported-conversion",
    });
  });
});
