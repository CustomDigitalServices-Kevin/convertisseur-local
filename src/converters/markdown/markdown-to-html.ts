// MD -> HTML: a complete, self-contained HTML document (minimal readable
// styling inlined, no external stylesheet/font/script -- keeps the strict
// app CSP and the "never leaves the device" promise intact for the output
// file itself). Fidelity "high": marked is a conforming CommonMark/GFM
// parser, nothing about the source structure is approximated.
import type { ConversionOutputFile } from "../../core/types";
import { markdownToHtmlBody } from "./pipelines";
import { baseName, escapeHtml, titleFromFileName, MIME_TYPES } from "./naming";
import { toArrayBuffer } from "../shared/binary";

const DOCUMENT_CSS = `
  body { font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.6em 0 0.6em; }
  pre { background: #f4f4f5; padding: 0.8em 1em; overflow-x: auto; border-radius: 6px; }
  code { background: #f4f4f5; padding: 0.15em 0.35em; border-radius: 4px; font-size: 0.9em; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #d0d0d5; margin: 1em 0; padding: 0.1em 1em; color: #444; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  th, td { border: 1px solid #d0d0d5; padding: 0.4em 0.7em; text-align: left; }
  img { max-width: 100%; }
`.trim();

export function markdownToHtmlFile(data: ArrayBuffer, fileName: string): ConversionOutputFile {
  const markdown = new TextDecoder("utf-8").decode(data);
  const bodyHtml = markdownToHtmlBody(markdown);
  const title = escapeHtml(titleFromFileName(fileName));

  const document = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${DOCUMENT_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`;

  return {
    name: `${baseName(fileName)}.html`,
    mimeType: MIME_TYPES.html,
    data: toArrayBuffer(new TextEncoder().encode(document)),
  };
}
