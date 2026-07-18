// MD -> TXT, HTML -> TXT (both go through the same AST-based
// htmlToPlainText -- MD is converted to HTML by marked real tokenizer
// first, never regexed) and TXT -> MD (trivial structural passthrough).
import type { ConversionOutputFile } from "../../core/types";
import { htmlToPlainText, markdownToHtmlBody } from "./pipelines";
import { baseName, MIME_TYPES } from "./naming";
import { toArrayBuffer } from "../shared/binary";

function toTextFile(fileName: string, text: string): ConversionOutputFile {
  return {
    name: `${baseName(fileName)}.txt`,
    mimeType: MIME_TYPES.txt,
    data: toArrayBuffer(new TextEncoder().encode(text)),
  };
}

export function markdownToTextFile(data: ArrayBuffer, fileName: string): ConversionOutputFile {
  const markdown = new TextDecoder("utf-8").decode(data);
  const html = markdownToHtmlBody(markdown);
  return toTextFile(fileName, htmlToPlainText(html));
}

export function htmlToTextFile(data: ArrayBuffer, fileName: string): ConversionOutputFile {
  const html = new TextDecoder("utf-8").decode(data);
  return toTextFile(fileName, htmlToPlainText(html));
}

// Markdown syntax that only triggers at the start of a line. Escaping just
// the first significant character is enough to neutralize it while leaving
// the rest of the line untouched.
const LEADING_MARKDOWN_SYNTAX = /^(\s*)(#{1,6}\s|[-*+]\s|>|```|~~~|\d+[.)]\s)/;

function escapeLeadingMarkdownSyntax(line: string): string {
  const match = LEADING_MARKDOWN_SYNTAX.exec(line);
  if (match === null) return line;
  const indent = match[1] ?? "";
  const marker = (match[2] ?? "").trimStart();
  const rest = line.slice(match[0].length);
  return `${indent}\\${marker}${rest}`;
}

/**
 * TXT -> MD: a trivial structural passthrough (per the brief). Blank-line
 * paragraphs become markdown paragraphs; the only transformation is
 * escaping characters that would otherwise be misread as markdown syntax
 * purely because of their position at the start of a line (a literal dash
 * bullet or hash heading typed in plain prose must not turn into one).
 */
export function textToMarkdownFile(data: ArrayBuffer, fileName: string): ConversionOutputFile {
  const text = new TextDecoder("utf-8").decode(data);
  const markdown = text
    .split("\n")
    .map((line) => escapeLeadingMarkdownSyntax(line.replace(/\r$/, "")))
    .join("\n");
  return {
    name: `${baseName(fileName)}.md`,
    mimeType: MIME_TYPES.md,
    data: toArrayBuffer(new TextEncoder().encode(markdown)),
  };
}
