// bmp-js ships no type declarations. This shim covers exactly the surface
// this module uses, verified against the installed 0.1.0 package
// (node_modules/bmp-js/lib/decoder.js + lib/encoder.js, and its own README)
// by direct source reading:
//
// - `decode(buffer)` (decoder.js) parses a BMP and returns the decoder
//   instance itself, exposing `width`, `height`, `bitPP` (bits per pixel:
//   1/4/8/16/24/32) and `data` -- a Node `Buffer` of `width*height*4` bytes
//   **in ABGR byte order per pixel** (README: "data-------byte array order
//   by ABGR ABGR ABGR, 4 bytes per pixel"), NOT RGBA. The alpha byte is only
//   meaningful when `bitPP === 32`; for every other depth reachable through
//   this public function (1/4/8/16/24 -- `bit15`'s real-alpha path needs a
//   second constructor argument this function never passes) the decoder
//   hardcodes it to 0, so callers must treat that byte as "no alpha info",
//   not "fully transparent". `buffer` must expose the same reading surface
//   as Node's `Buffer` (see node-buffer-shim.ts, which supplies this in a
//   Worker where no real Buffer global exists).
// - `encode(imgData, quality?)` (encoder.js) takes `{ data, width, height }`
//   where `data` must already be in the same ABGR byte order (the encoder
//   explicitly skips the first byte of each pixel -- comment `//a` -- and
//   writes bytes 2/3/4 as blue/green/red) and always emits an uncompressed
//   24-bit BMP (alpha is never written to the output). `quality` is accepted
//   for API symmetry but unused (BMP 24-bit has no lossy compression). The
//   `data` Buffer in the *output* `{ data, width, height }` is constructed
//   with `new Buffer(...)` internally, so encoding also requires the global
//   `Buffer` shim to be installed first.
declare module "bmp-js" {
  export interface BmpBuffer {
    readonly length: number;
    [index: number]: number;
  }

  export interface BmpDecodedImage {
    width: number;
    height: number;
    bitPP: number;
    data: BmpBuffer;
  }

  export interface BmpEncodeInput {
    data: BmpBuffer;
    width: number;
    height: number;
  }

  export interface BmpEncodedImage {
    data: BmpBuffer;
    width: number;
    height: number;
  }

  const bmpJs: {
    decode(buffer: BmpBuffer): BmpDecodedImage;
    encode(imgData: BmpEncodeInput, quality?: number): BmpEncodedImage;
  };

  export default bmpJs;
}
