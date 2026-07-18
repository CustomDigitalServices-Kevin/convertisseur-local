import type { FileFormat } from "../core/types";

/**
 * Visual grouping used only for the file-card icon color. Every FileFormat
 * is mapped exhaustively (TS enforces it via Record<FileFormat, ...>) so a
 * new format added to core/types.ts cannot silently fall through unstyled.
 */
export type FileFamily = "pdf" | "image" | "spreadsheet" | "document" | "data" | "archive";

const FAMILY_BY_FORMAT: Record<FileFormat, FileFamily> = {
  pdf: "pdf",
  png: "image",
  jpeg: "image",
  webp: "image",
  avif: "image",
  svg: "image",
  tiff: "image",
  gif: "image",
  bmp: "image",
  xlsx: "spreadsheet",
  csv: "spreadsheet",
  docx: "document",
  md: "document",
  txt: "document",
  html: "document",
  epub: "document",
  json: "data",
  yaml: "data",
  xml: "data",
  zip: "archive",
};

export function familyFor(format: FileFormat): FileFamily {
  return FAMILY_BY_FORMAT[format];
}

interface FamilyClasses {
  bg: string;
  text: string;
  border: string;
}

// Soft-glow badge classes: base family color at low opacity for background
// and border, full color for the text/icon (Tailwind v4 resolves the /NN
// opacity modifier for any --color-* theme token, custom ones included).
export const FAMILY_CLASSES: Record<FileFamily, FamilyClasses> = {
  pdf: { bg: "bg-red/10", text: "text-red", border: "border-red/20" },
  image: { bg: "bg-blue/10", text: "text-blue", border: "border-blue/20" },
  spreadsheet: { bg: "bg-green/10", text: "text-green", border: "border-green/20" },
  document: { bg: "bg-orange-light/10", text: "text-orange-light", border: "border-orange-light/20" },
  data: { bg: "bg-violet/10", text: "text-violet", border: "border-violet/20" },
  archive: { bg: "bg-faint/10", text: "text-faint", border: "border-faint/25" },
};

export const UNKNOWN_FAMILY_CLASSES: FamilyClasses = {
  bg: "bg-faint/10",
  text: "text-faint",
  border: "border-faint/25",
};
