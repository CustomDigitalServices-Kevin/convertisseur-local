// Shared, DOM-free text pipelines built on unified/rehype/remark. This is
// the "pipeline unified DOM-free" the brief mandates instead of turndown:
// turndown needs a real `DOMParser`, which does not exist in a dedicated Web
// Worker (Exposed=Window only, confirmed empirically -- see the EPUB
// decision note in module.ts for the same constraint hitting
// epub-gen-memory). rehype-parse/hast-util-from-html and remark-parse are
// pure-JS parsers with no DOM dependency, which is exactly why the static-site
// generator ecosystem (Astro, Next MDX, etc.) runs them in Node/edge/worker
// contexts routinely.
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { toText } from "hast-util-to-text";
import { marked } from "marked";

/** MD -> HTML body fragment (not a full document -- callers wrap it). */
export function markdownToHtmlBody(markdown: string): string {
  return marked.parse(markdown, { async: false, gfm: true, breaks: false });
}

/**
 * HTML -> MD via a real HTML AST (hast) turned into a real MD AST (mdast).
 * remark-gfm is required here on the *stringify* side: without it,
 * mdast-util-to-markdown has no serializer for `table` nodes (hast-util-to-mdast,
 * driven by rehype-remark, already emits GFM table nodes for `<table>` out of
 * the box) and throws "Cannot handle unknown node".
 */
export async function htmlToMarkdown(html: string): Promise<string> {
  const file = await unified()
    .use(rehypeParse, { fragment: false })
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify, { bullet: "-", fences: true, rule: "-" })
    .process(html);
  return String(file).trim();
}

/**
 * HTML -> plain text, extracted from the parsed AST with block-aware
 * whitespace collapsing (hast-util-to-text implements an `innerText`-like
 * algorithm), never a regex stripping `<[^>]*>` tags naively. Synchronous:
 * only the parser stage is needed, there is nothing to transform or compile.
 */
export function htmlToPlainText(html: string): string {
  const tree = unified().use(rehypeParse, { fragment: false }).parse(html);
  return toText(tree, { whitespace: "normal" }).trim();
}

/**
 * HTML -> a self-contained, well-formed XHTML fragment (all void elements
 * self-closed, entities escaped): what the EPUB builder needs, since an
 * EPUB chapter is parsed as XML by e-readers and a bare `<br>` or unescaped
 * `&` breaks the whole package. Re-parsing through rehype (rather than
 * trusting the source, whether it came from marked or from an arbitrary
 * uploaded .html file) guarantees this regardless of how loose the input
 * markup is.
 */
export async function htmlToXhtmlFragment(html: string): Promise<string> {
  // fragment: true -- the caller (epub-builder.ts chapterDocument) already
  // supplies its own <html>/<head>/<body> wrapper; parsing in fragment mode
  // here avoids nesting a second one inside it, whether the source was a
  // body-only string (from markdownToHtmlBody) or a full uploaded .html
  // document (whose html/head/body wrapper tags are dropped by the fragment
  // parsing algorithm, keeping their meaningful children).
  const file = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeStringify, { closeSelfClosing: true, closeEmptyElements: true })
    .process(html);
  return String(file);
}
