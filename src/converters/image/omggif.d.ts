// omggif ships no type declarations. This shim covers exactly the surface
// this module uses (decode only -- encode goes through gifenc instead),
// verified against the installed 1.0.10 package (node_modules/omggif/omggif.js)
// by direct source reading:
//
// - `new GifReader(buf)` (line 366) parses a GIF87a/89a byte stream and
//   throws a plain `Error` on an invalid header.
// - `.width` / `.height` (lines 403-404) are the logical screen dimensions.
// - `.numFrames()` returns the frame count; this module only ever decodes
//   frame 0.
// - `.decodeAndBlitFrameRGBA(frameNum, pixels)` (line 596) decodes one frame
//   and writes RGBA8 bytes into the caller-supplied `pixels` buffer, which
//   must be pre-sized to `width * height * 4` and covers the *full* logical
//   screen (frames smaller than the screen, or offset within it, are handled
//   internally by the library).
declare module "omggif" {
  export class GifReader {
    constructor(buffer: Uint8Array);
    readonly width: number;
    readonly height: number;
    numFrames(): number;
    decodeAndBlitFrameRGBA(frameNum: number, pixels: Uint8ClampedArray | Uint8Array): void;
  }
}
