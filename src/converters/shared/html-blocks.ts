// Minimal HTML -> layout-block parser used by the "render to HTML, then to
// PDF" pipeline (xlsx-to-pdf and docx-to-pdf both go through this). This is
// deliberately not a general HTML/DOM parser: the worker has no DOM to
// delegate to, and the only producers of this HTML are our own
// xlsx-to-tabular table generator and mammoth's docx output, both of which
// emit a small, well-known tag vocabulary (headings, paragraphs, lists,
// tables, plus inline formatting we intentionally flatten to plain text).

export type HtmlBlock =
  | { kind: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "listItem"; text: string }
  | { kind: "table"; rows: string[][] };

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replaceAll(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isNaN(code) ? match : String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

function stripTags(fragment: string): string {
  return decodeEntities(fragment.replaceAll(/<[^>]*>/g, "")).replaceAll(/\s+/g, " ").trim();
}

function parseTableRows(tableInner: string): string[][] {
  const rows: string[][] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch = rowRe.exec(tableInner);
  while (rowMatch !== null) {
    const rowHtml = rowMatch[1] ?? "";
    const cells: string[] = [];
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch = cellRe.exec(rowHtml);
    while (cellMatch !== null) {
      cells.push(stripTags(cellMatch[1] ?? ""));
      cellMatch = cellRe.exec(rowHtml);
    }
    rows.push(cells);
    rowMatch = rowRe.exec(tableInner);
  }
  return rows;
}

const BLOCK_RE =
  /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>|<p[^>]*>([\s\S]*?)<\/p>|<table[^>]*>([\s\S]*?)<\/table>|<li[^>]*>([\s\S]*?)<\/li>/gi;

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

function toHeadingLevel(raw: string): (typeof HEADING_LEVELS)[number] {
  const parsed = Number(raw);
  return HEADING_LEVELS.find((level) => level === parsed) ?? 6;
}

/** Parses a constrained HTML subset into an ordered list of layout blocks. */
export function parseHtmlBlocks(html: string): HtmlBlock[] {
  const withoutNoise = html.replaceAll(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
  const blocks: HtmlBlock[] = [];
  BLOCK_RE.lastIndex = 0;
  let match = BLOCK_RE.exec(withoutNoise);
  while (match !== null) {
    const [, headingLevel, headingInner, paragraphInner, tableInner, listInner] = match;
    if (headingLevel !== undefined) {
      const text = stripTags(headingInner ?? "");
      if (text.length > 0) blocks.push({ kind: "heading", level: toHeadingLevel(headingLevel), text });
    } else if (paragraphInner !== undefined) {
      const text = stripTags(paragraphInner);
      if (text.length > 0) blocks.push({ kind: "paragraph", text });
    } else if (tableInner !== undefined) {
      const rows = parseTableRows(tableInner);
      if (rows.length > 0) blocks.push({ kind: "table", rows });
    } else if (listInner !== undefined) {
      const text = stripTags(listInner);
      if (text.length > 0) blocks.push({ kind: "listItem", text });
    }
    match = BLOCK_RE.exec(withoutNoise);
  }
  return blocks;
}
