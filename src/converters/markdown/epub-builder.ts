// Low-level EPUB (3.0) assembly with fflate, built by hand instead of a
// packaging library. Decision recorded in module.ts: epub-gen-memory calls
// `new DOMParser()` on every chapter (dist/lib/util/html-parse-browser.js),
// and DOMParser is Exposed=Window only per the DOM Parsing and Serialization
// spec -- it does not exist in a dedicated Web Worker, confirmed empirically
// (a vitest happy-dom pass is not evidence: happy-dom polyfills `window`
// globally, which a real browser Worker does not). An EPUB is just a zip
// with a fixed structure (verified against the W3C EPUB 3.3 spec,
// https://www.w3.org/TR/epub-33/#sec-package-doc and
// https://www.w3.org/TR/epub-33/#sec-container-metainf-container.xml), so
// building it directly with fflate (already an approved, license-cleared
// dependency) avoids the whole DOM-in-worker problem.
import { zipSync } from "fflate";
import { escapeHtml } from "./naming";

export interface EpubChapter {
  readonly id: string;
  readonly title: string;
  /** Well-formed XHTML body markup (see pipelines.ts htmlToXhtmlFragment). */
  readonly bodyXhtml: string;
}

function chapterFileName(chapter: EpubChapter): string {
  return `${chapter.id}.xhtml`;
}

function chapterDocument(chapter: EpubChapter): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head><meta charset="utf-8" /><title>${escapeHtml(chapter.title)}</title></head>
<body>
${chapter.bodyXhtml}
</body>
</html>
`;
}

function navDocument(title: string, chapters: readonly EpubChapter[]): string {
  const items = chapters
    .map((chapter) => `      <li><a href="${chapterFileName(chapter)}">${escapeHtml(chapter.title)}</a></li>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head><meta charset="utf-8" /><title>${escapeHtml(title)}</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${escapeHtml(title)}</h1>
    <ol>
${items}
    </ol>
  </nav>
</body>
</html>
`;
}

function packageDocument(title: string, uuid: string, modified: string, chapters: readonly EpubChapter[]): string {
  const manifestChapters = chapters
    .map(
      (chapter) =>
        `    <item id="${chapter.id}" href="${chapterFileName(chapter)}" media-type="application/xhtml+xml" />`,
    )
    .join("\n");
  const spineItems = chapters.map((chapter) => `    <itemref idref="${chapter.id}" />`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">urn:uuid:${uuid}</dc:identifier>
    <dc:title>${escapeHtml(title)}</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" />
${manifestChapters}
  </manifest>
  <spine>
${spineItems}
  </spine>
</package>
`;
}

const CONTAINER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
  </rootfiles>
</container>
`;

/**
 * Assembles a complete EPUB 3 file. Zip entry order matters: `mimetype`
 * must be the first entry, stored (uncompressed), for a reading system to
 * recognize the file by peeking its first bytes without inflating anything
 * (the same convention Java JAR/ODF containers use).
 */
export function buildEpub(title: string, uuid: string, modified: string, chapters: readonly EpubChapter[]): ArrayBuffer {
  const entries: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {
    mimetype: [new TextEncoder().encode("application/epub+zip"), { level: 0 }],
    "META-INF/container.xml": new TextEncoder().encode(CONTAINER_XML),
    "OEBPS/content.opf": new TextEncoder().encode(packageDocument(title, uuid, modified, chapters)),
    "OEBPS/nav.xhtml": new TextEncoder().encode(navDocument(title, chapters)),
  };
  for (const chapter of chapters) {
    entries[`OEBPS/${chapterFileName(chapter)}`] = new TextEncoder().encode(chapterDocument(chapter));
  }

  const zipped = zipSync(entries, { level: 6 });
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength);
}
