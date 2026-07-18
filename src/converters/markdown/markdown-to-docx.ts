// MD -> DOCX: parses markdown into a real mdast AST (remark-parse +
// remark-gfm, so GFM tables/task-lists/strikethrough are recognized) and
// maps it onto the object model of the docx library. Fidelity "medium":
// headings, paragraphs, bulleted/numbered lists (including nesting), bold/
// italic/inline-code and tables survive; links and images are flattened to
// their visible text (no hyperlink/embedded-image reproduction), raw
// embedded HTML is flattened to its visible text, and footnotes/frontmatter
// are dropped -- all deliberate, documented simplifications of the same
// kind as the office module xlsx -> pdf ("medium") conversion.
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { toString as mdastToString } from "mdast-util-to-string";
import type {
  AlignType,
  Blockquote,
  Code,
  List,
  ListItem,
  PhrasingContent,
  Root,
  RootContent,
  Table as MdTable,
  TableCell as MdTableCell,
  TableRow as MdTableRow,
} from "mdast";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ConversionOutputFile } from "../../core/types";
import { baseName, MIME_TYPES } from "./naming";
import { toArrayBuffer } from "../shared/binary";

const CODE_FONT = "Courier New";
const ORDERED_LIST_REFERENCE = "md-ordered-list";
const MAX_LIST_LEVEL = 3;
const TWIPS_PER_LEVEL = 360;

const HEADING_LEVELS = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
} as const;

interface InlineStyle {
  readonly bold?: boolean;
  readonly italics?: boolean;
}

// exactOptionalPropertyTypes forbids passing `{ bold: undefined }` to docx
// option objects whose fields are declared as plain optional booleans (not
// `boolean | undefined`), so every run is built by conditionally spreading
// only the keys that are actually true/defined.
function textRun(text: string, style: InlineStyle = {}, font?: string): TextRun {
  return new TextRun({
    text,
    ...(style.bold === true ? { bold: true } : {}),
    ...(style.italics === true ? { italics: true } : {}),
    ...(font !== undefined ? { font } : {}),
  });
}

function inlineRuns(nodes: readonly PhrasingContent[], style: InlineStyle = {}): TextRun[] {
  const runs: TextRun[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        runs.push(textRun(node.value, style));
        break;
      case "strong":
        runs.push(...inlineRuns(node.children, { ...style, bold: true }));
        break;
      case "emphasis":
        runs.push(...inlineRuns(node.children, { ...style, italics: true }));
        break;
      case "delete":
        runs.push(...inlineRuns(node.children, style));
        break;
      case "inlineCode":
        runs.push(textRun(node.value, style, CODE_FONT));
        break;
      case "link":
        runs.push(...inlineRuns(node.children, style));
        break;
      case "break":
        runs.push(new TextRun({ break: 1 }));
        break;
      case "image":
      case "imageReference": {
        const alt = "alt" in node ? (node.alt ?? "") : "";
        if (alt.length > 0) runs.push(textRun(alt, { italics: true }));
        break;
      }
      default: {
        const text = mdastToString(node);
        if (text.length > 0) runs.push(textRun(text, style));
      }
    }
  }
  return runs;
}

function codeBlockParagraph(node: Code): Paragraph {
  const lines = node.value.split("\n");
  const runs: TextRun[] = [];
  lines.forEach((line, index) => {
    if (index > 0) runs.push(new TextRun({ break: 1 }));
    runs.push(textRun(line, {}, CODE_FONT));
  });
  return new Paragraph({ children: runs, spacing: { before: 120, after: 120 } });
}

interface ListCounters {
  orderedInstance: number;
}

function listToDocxParagraphs(list: List, level: number, counters: ListCounters): Paragraph[] {
  const clampedLevel = Math.min(level, MAX_LIST_LEVEL);
  const ordered = list.ordered === true;
  const paragraphs: Paragraph[] = [];
  for (const item of list.children) {
    paragraphs.push(...listItemToDocxParagraphs(item, clampedLevel, ordered, counters));
  }
  return paragraphs;
}

function listItemToDocxParagraphs(
  item: ListItem,
  level: number,
  ordered: boolean,
  counters: ListCounters,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let leadWritten = false;
  const instance = ordered ? (counters.orderedInstance += 1) : 0;

  for (const child of item.children) {
    if (!leadWritten && child.type === "paragraph") {
      const runs = inlineRuns(child.children);
      if (typeof item.checked === "boolean") {
        runs.unshift(new TextRun({ text: item.checked ? "[x] " : "[ ] " }));
      }
      paragraphs.push(
        ordered
          ? new Paragraph({ children: runs, numbering: { reference: ORDERED_LIST_REFERENCE, level, instance } })
          : new Paragraph({ children: runs, bullet: { level } }),
      );
      leadWritten = true;
    } else if (child.type === "list") {
      paragraphs.push(...listToDocxParagraphs(child, level + 1, counters));
    } else if (child.type === "paragraph") {
      paragraphs.push(
        new Paragraph({ children: inlineRuns(child.children), indent: { left: TWIPS_PER_LEVEL * (level + 1) } }),
      );
    } else {
      for (const block of blockNodesToDocx([child], counters)) {
        paragraphs.push(...(block instanceof Table ? [] : [block]));
      }
    }
  }

  if (!leadWritten) {
    paragraphs.push(
      ordered
        ? new Paragraph({ numbering: { reference: ORDERED_LIST_REFERENCE, level, instance } })
        : new Paragraph({ bullet: { level } }),
    );
  }
  return paragraphs;
}

function tableAlignment(
  align: AlignType | null | undefined,
): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  if (align === "center") return AlignmentType.CENTER;
  if (align === "right") return AlignmentType.END;
  if (align === "left") return AlignmentType.START;
  return undefined;
}

function tableCellToDocx(cell: MdTableCell, align: AlignType | null | undefined): TableCell {
  const alignment = tableAlignment(align);
  return new TableCell({
    children: [new Paragraph({ children: inlineRuns(cell.children), ...(alignment !== undefined ? { alignment } : {}) })],
  });
}

function tableRowToDocx(row: MdTableRow, aligns: readonly (AlignType | null | undefined)[]): TableRow {
  return new TableRow({ children: row.children.map((cell, index) => tableCellToDocx(cell, aligns[index])) });
}

function tableToDocx(node: MdTable): Table {
  const aligns = node.align ?? [];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: node.children.map((row) => tableRowToDocx(row, aligns)),
  });
}

/**
 * Blockquote children are almost always a single paragraph in practice; each
 * direct paragraph child is rendered indented, other block types (nested
 * list/table/code) fall through to the normal block walker unindented,
 * visually distinguishing quoted prose while keeping structural content
 * (list items, table cells) intact rather than force-fitting them into a
 * property (like paragraph indent) that does not apply to a Table.
 */
function blockquoteToDocx(node: Blockquote, counters: ListCounters): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  for (const child of node.children) {
    if (child.type === "paragraph") {
      out.push(new Paragraph({ children: inlineRuns(child.children), indent: { left: TWIPS_PER_LEVEL } }));
    } else {
      out.push(...blockNodesToDocx([child], counters));
    }
  }
  return out;
}

function blockNodesToDocx(nodes: readonly RootContent[], counters: ListCounters): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "heading":
        out.push(new Paragraph({ heading: HEADING_LEVELS[node.depth], children: inlineRuns(node.children) }));
        break;
      case "paragraph":
        out.push(new Paragraph({ children: inlineRuns(node.children) }));
        break;
      case "thematicBreak":
        out.push(new Paragraph({ thematicBreak: true }));
        break;
      case "blockquote":
        out.push(...blockquoteToDocx(node, counters));
        break;
      case "code":
        out.push(codeBlockParagraph(node));
        break;
      case "list":
        out.push(...listToDocxParagraphs(node, 0, counters));
        break;
      case "table":
        out.push(tableToDocx(node));
        break;
      case "html": {
        const text = node.value.trim();
        if (text.length > 0) out.push(new Paragraph({ children: [textRun(text, { italics: true })] }));
        break;
      }
      case "definition":
      case "footnoteDefinition":
      case "yaml":
        // No visual output: reference targets and frontmatter are metadata,
        // not document content (documented limitation).
        break;
      default:
        break;
    }
  }
  return out;
}

function parseMarkdown(markdown: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown);
}

export async function markdownToDocxFile(data: ArrayBuffer, fileName: string): Promise<ConversionOutputFile> {
  const markdown = new TextDecoder("utf-8").decode(data);
  const tree = parseMarkdown(markdown);
  const counters: ListCounters = { orderedInstance: 0 };
  const children = blockNodesToDocx(tree.children, counters);

  const document = new Document({
    numbering: {
      config: [
        {
          reference: ORDERED_LIST_REFERENCE,
          levels: [0, 1, 2, 3].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${String(level + 1)}.`,
            alignment: AlignmentType.START,
          })),
        },
      ],
    },
    sections: [{ children: children.length > 0 ? children : [new Paragraph("")] }],
  });

  const buffer = await Packer.toArrayBuffer(document);
  return {
    name: `${baseName(fileName)}.docx`,
    mimeType: MIME_TYPES.docx,
    data: toArrayBuffer(new Uint8Array(buffer)),
  };
}
