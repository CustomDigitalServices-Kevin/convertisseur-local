import type { FileFormat } from "../../core/types";

/** The subset of FileFormat this converter module actually handles. */
export type ImageFormat = Extract<FileFormat, "png" | "jpeg" | "webp" | "avif" | "svg">;

/** Formats this module can produce. SVG is a source-only format (rasterized to PNG). */
export type ImageOutputFormat = Exclude<ImageFormat, "svg">;

export function mimeTypeFor(format: ImageOutputFormat): string {
  switch (format) {
    case "png":
      return "image/png";
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "avif":
      return "image/avif";
  }
}

// File.name (the only real-world source of `fileName`) never contains a
// path separator, so stripping from the last dot onward is sufficient and
// avoids escaping a separator character in the regex.
export function withExtension(fileName: string, format: ImageOutputFormat): string {
  const lastDot = fileName.lastIndexOf(".");
  const base = lastDot === -1 ? fileName : fileName.slice(0, lastDot);
  return `${base}.${format}`;
}

/** Clamps a user-supplied 0..1 quality value defensively before it reaches a codec. */
export function clampQuality(quality: number): number {
  return Math.min(1, Math.max(0, quality));
}
