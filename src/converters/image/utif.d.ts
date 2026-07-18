// utif ships no type declarations. This shim covers exactly the surface this
// module uses, verified against the installed 3.1.0 package
// (node_modules/utif/UTIF.js) by direct source reading:
//
// - `UTIF.decode(buff)` (line 82) parses the TIFF container and returns one
//   IFD (Image File Directory) object per page/subimage. Each IFD is a plain
//   object keyed by numeric TIFF tag ("t256" = ImageWidth, "t257" =
//   ImageLength, etc.) and carries NO `width`/`height` properties yet.
// - `UTIF.decodeImage(buff, ifd, ifds)` (line 101) decodes the pixel data for
//   one page and MUTATES that ifd in place, adding `width`/`height` (and an
//   internal decoded `data` buffer consumed by toRGBA8). This is why
//   `width`/`height` are typed optional here: they only exist after this
//   call.
// - `UTIF.toRGBA8(ifd)` (line 983) reads the mutated ifd and returns a flat
//   RGBA8 buffer (`Uint8Array`, length = width*height*4).
// - `UTIF.encodeImage(rgba, w, h, metadata)` (line 49) builds a minimal
//   single-page uncompressed TIFF from a flat RGBA8 buffer and returns its
//   bytes as `data.buffer` -- a real `ArrayBuffer`, not a view.
declare module "utif" {
  export interface UtifIfd {
    width?: number;
    height?: number;
  }

  const UTIF: {
    decode(buffer: ArrayBuffer | Uint8Array): UtifIfd[];
    decodeImage(buffer: ArrayBuffer | Uint8Array, ifd: UtifIfd, ifds?: UtifIfd[]): void;
    toRGBA8(ifd: UtifIfd): Uint8Array;
    encodeImage(
      rgba: Uint8Array | Uint8ClampedArray,
      width: number,
      height: number,
      metadata?: Record<string, unknown>,
    ): ArrayBuffer;
  };

  export default UTIF;
}
