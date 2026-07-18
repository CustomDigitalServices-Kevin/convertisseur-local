// Generates tests/fixtures/sample-text.pdf: a real, valid PDF with
// extractable text at two distinct font sizes (a large title line, smaller
// body paragraph lines), used by the markdown module PDF -> MD/DOCX/TXT
// heuristic-reconstruction tests. Run with `node tests/fixtures/generate-markdown.mjs`;
// the output file is committed, tests never regenerate it.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

async function generateTextPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);
  let y = 780;

  page.drawText("Fixture Title", { x: 48, y, size: 24, font: boldFont, color: rgb(0, 0, 0) });
  y -= 50;
  page.drawText("First paragraph line one of body text.", { x: 48, y, size: 11, font, color: rgb(0, 0, 0) });
  y -= 16;
  page.drawText("First paragraph line two, still the same block.", { x: 48, y, size: 11, font, color: rgb(0, 0, 0) });
  y -= 40;
  page.drawText("Second paragraph after a larger vertical gap.", { x: 48, y, size: 11, font, color: rgb(0, 0, 0) });

  const bytes = await doc.save();
  writeFileSync(join(here, "sample-text.pdf"), Buffer.from(bytes));
}

await generateTextPdf();
console.log("Fixture written: sample-text.pdf");
