// gifenc ships no type declarations. This shim covers exactly the surface
// this module uses, verified against the installed 1.0.3 package
// (node_modules/gifenc/README.md "API" section + dist/gifenc.js export list)
// by direct source reading:
//
// - `quantize(rgba, maxColors, options)` reduces a flat RGBA8 buffer to a
//   palette of at most `maxColors` entries (each `[r,g,b]` or `[r,g,b,a]`
//   depending on `options.format`).
// - `applyPalette(rgba, palette, format)` maps each pixel to its nearest
//   palette index, returning a `Uint8Array` of length `rgba.length / 4`.
// - `GIFEncoder(options)` creates an encoder stream; `.writeFrame` encodes
//   one indexed-bitmap frame, `.finish()` writes the trailer, `.bytes()`
//   returns the encoded GIF as a `Uint8Array` (a fresh copy per the README).
declare module "gifenc" {
  export type RgbColor = [number, number, number];
  export type RgbaColor = [number, number, number, number];

  export interface QuantizeOptions {
    format?: "rgb565" | "rgb444" | "rgba4444";
    oneBitAlpha?: boolean | number;
    clearAlpha?: boolean;
    clearAlphaThreshold?: number;
    clearAlphaColor?: number;
  }

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: QuantizeOptions,
  ): Array<RgbColor | RgbaColor>;

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Array<RgbColor | RgbaColor>,
    format?: "rgb565" | "rgb444" | "rgba4444",
  ): Uint8Array;

  export interface GifEncoderOptions {
    auto?: boolean;
    initialCapacity?: number;
  }

  export interface WriteFrameOptions {
    palette?: Array<RgbColor | RgbaColor>;
    first?: boolean;
    transparent?: boolean;
    transparentIndex?: number;
    delay?: number;
    repeat?: number;
    dispose?: number;
  }

  export interface GifEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: WriteFrameOptions,
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }

  export function GIFEncoder(options?: GifEncoderOptions): GifEncoderInstance;
}
