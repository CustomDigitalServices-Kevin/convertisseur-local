// Generates the committed binary fixtures used by the office converter
// tests. Run once with `node tests/fixtures/generate.mjs` whenever a
// fixture needs to change; the *output* files (not just this script) are
// committed, so tests never depend on regenerating them.
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

async function generateXlsx() {
  const workbook = new ExcelJS.Workbook();

  const data = workbook.addWorksheet("Data");
  data.addRow(["Name", "Amount", "Active", "Created"]);
  data.addRow(["Alice", 100, true, new Date(Date.UTC(2026, 0, 15))]);
  data.addRow(["Bob", 200.5, false, new Date(Date.UTC(2026, 1, 1))]);
  // Formula cell with no cached result: exercises the "=formula" fallback
  // in cellDisplayText, and — critically — CSV formula-injection
  // neutralization, since its display text starts with "=".
  const totalRow = data.addRow(["Total", null, null, null]);
  totalRow.getCell(2).value = { formula: "SUM(B2:B3)" };
  // A plain text cell that merely *looks* like a formula (not an XLSX
  // formula at all): CSV injection neutralization must catch this too,
  // since the OWASP mitigation is based on the output text, not the
  // source cell type.
  data.addRow(["=HYPERLINK(\"http://evil.example\")", 0, true, null]);

  const notes = workbook.addWorksheet("Notes");
  notes.addRow(["Note"]);
  notes.addRow(["Multi-sheet export check"]);
  notes.addRow(['A "quoted, tricky" value, with a comma']);

  const buffer = await workbook.xlsx.writeBuffer();
  writeFileSync(join(here, "sample-multisheet.xlsx"), Buffer.from(buffer));
}

function xml(strings, ...values) {
  return strings.reduce((acc, part, i) => acc + part + (values[i] ?? ""), "");
}

function buildDocxParts() {
  const contentTypes = xml`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rootRels = xml`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const documentXml = xml`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Convertisseur Local Fixture</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>This is a minimal DOCX fixture generated for the office converter tests.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>It contains extractable plain text across multiple paragraphs.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

  return { contentTypes, rootRels, documentXml };
}

async function generateDocx() {
  const { zipSync, strToU8 } = await import("fflate");
  const { contentTypes, rootRels, documentXml } = buildDocxParts();

  const files = {
    "[Content_Types].xml": strToU8(contentTypes),
    "_rels/.rels": strToU8(rootRels),
    "word/document.xml": strToU8(documentXml),
  };

  const zipped = zipSync(files, { level: 0 });
  writeFileSync(join(here, "sample.docx"), Buffer.from(zipped));
}

await generateXlsx();
await generateDocx();
console.log("Fixtures written: sample-multisheet.xlsx, sample.docx");
