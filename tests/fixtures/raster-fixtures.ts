// Minimal, real, valid raster fixtures for the image converter tests.
// Committed as literal byte arrays (not opaque binary blobs) so they are
// readable and auditable in a plain git diff.
//
// PNG_2X2: a hand-built, spec-valid 2x2 truecolor PNG (signature + IHDR +
// one IDAT chunk holding two zlib-deflated scanlines + IEND). Generated with
// Node's built-in zlib.deflateSync for the IDAT payload and a standard
// CRC32 (ISO 3309 / PNG Annex D) for each chunk's checksum, then
// round-tripped through zlib.inflateSync to confirm the pixel bytes match
// before being embedded here. Pixels: row0 = red, green; row1 = blue, white.
export const PNG_2X2 = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2,
  0, 0, 0, 2, 8, 2, 0, 0, 0, 253, 212, 154, 115, 0, 0, 0, 20, 73, 68, 65,
  84, 120, 218, 99, 248, 207, 192, 192, 0, 194, 12, 255, 255, 255, 255, 15, 0, 31, 238, 5,
  251, 96, 108, 112, 242, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]).buffer;

// JPEG_1X1: the public-domain "smallest valid JPG" reference (baseline
// Huffman-coded, JFIF, 1x1 pixel) by scotthaleen
// (https://gist.github.com/scotthaleen/32f76a413e0dfd4b4d79c2a534d49c0b),
// with one correction: that reference ends its entropy-coded scan without
// an explicit End-Of-Image marker, relying on decoders treating EOF as an
// implicit terminator. We append the standard 0xFF 0xD9 EOI marker so the
// file is unambiguously spec-complete rather than depending on decoder
// leniency.
export const JPEG_1X1 = new Uint8Array([
  255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, 0, 72, 0, 72, 0, 0,
  255, 219, 0, 67, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 194, 0, 11, 8, 0, 1, 0, 1, 1, 1,
  17, 0, 255, 196, 0, 20, 16, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 255, 218, 0, 8, 1, 1, 0, 1, 63, 16, 255, 217,
]).buffer;
