// Serializers shared by every conversion that produces the shared HtmlBlock
// intermediate representation (src/converters/shared/html-blocks.ts) and
// needs a text-ish output instead of a rendered PDF: PDF -> MD, PDF -> DOCX
// and PDF -> TXT all funnel through here after pdf-extract.ts turns raw PDF
// text items into blocks.
import type { HtmlBlock } from "../shared/html-blocks";

const MARKDOWN_SPECIAL_CHARS = /([\\`*_{}[\]()#+.!|])/g;

function markdownEscape(text: string): string {
  return text.replaceAll(MARKDOWN_SPECIAL_CHARS, "\\$1");
}

export function blocksToMarkdown(blocks: readonly HtmlBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case "heading":
        parts.push(`${"#".repeat(block.level)} ${block.text}`);
        break;
      case "paragraph":
        parts.push(block.text);
        break;
      case "listItem":
        parts.push(`- ${block.text}`);
        break;
      case "table": {
        const [header, ...rows] = block.rows;
        if (header !== undefined) {
          const escapedHeader = header.map(markdownEscape);
          parts.push(`| ${escapedHeader.join(" | ")} |`);
          parts.push(`| ${header.map(() => "---").join(" | ")} |`);
          for (const row of rows) parts.push(`| ${row.map(markdownEscape).join(" | ")} |`);
        }
        break;
      }
    }
  }
  return parts.join("\n\n").trim();
}

export function blocksToText(blocks: readonly HtmlBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case "heading":
      case "paragraph":
        parts.push(block.text);
        break;
      case "listItem":
        parts.push(`- ${block.text}`);
        break;
      case "table":
        for (const row of block.rows) parts.push(row.join("\t"));
        break;
    }
  }
  return parts.join("\n\n").trim();
}

